import Session from '../entities/Session';
import PasswordResetToken from '../entities/PasswordResetToken';
import { getDB } from '../data-source';
import User from '../entities/User';
import { Role } from 'shared';
import bcrypt from 'bcrypt';
import { Resend } from 'resend';

interface SessionWithToken extends Session {
  token: string;
}

const SESSION_TIMEOUT_SEC = 60 * 60 * 24; // 1 day
const BCRYPT_SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRY_MIN = 30; // 30 minutes

export class UserService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY!);
  }
  /**
   * Generates sesssion IDs and secrets using 120 bits of entropy. See more: https://lucia-auth.com/sessions/basic
   * @returns a cryptographically secure random string
   */
  private generateSecureRandomString(): string {
    // Human readable alphabet (a-z, 0-9 without l, o, 0, 1 to avoid confusion)
    const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';

    // Generate 24 bytes = 192 bits of entropy.
    // We're only going to use 5 bits per byte so the total entropy will be 192 * 5 / 8 = 120 bits
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);

    let id = '';
    for (let i = 0; i < bytes.length; i++) {
      // >> 3 "removes" the right-most 3 bits of the byte
      id += alphabet[bytes[i] >> 3];
    }
    return id;
  }
  private async hashSecret(secret: string): Promise<Uint8Array> {
    const secretBytes = new TextEncoder().encode(secret);
    const secretHashBuffer = await crypto.subtle.digest('SHA-256', secretBytes);
    return new Uint8Array(secretHashBuffer);
  }
  private parseToken(token: string): [string, string] | null {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    return [parts[0], parts[1]];
  }
  /**
   * Constant time comparison helps prevent timing attacks where
   * attackers can measure how long it takes for the system to reject 
   * invalid tokens and use that information to guess valid tokens.
   */
  private constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.byteLength !== b.byteLength) {
      return false;
    }
    let c = 0;
    for (let i = 0; i < a.byteLength; i++) {
      c |= a[i] ^ b[i];
    }
    return c === 0;
  }
  async validateSessionToken(token: string): Promise<Session | null> {
    const parsed = this.parseToken(token);
    if (!parsed) return null;
    const [sessionId, sessionSecret] = parsed;

    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const tokenSecretHash = await this.hashSecret(sessionSecret);
    const validSecret = this.constantTimeEqual(
      tokenSecretHash,
      new Uint8Array(Buffer.from(session.secretHash, 'base64'))
    );
    if (!validSecret) {
      return null;
    }

    return session;
  }
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async createUser(name: string, email: string, password: string): Promise<User> {
    const db = getDB();

    // Check if user already exists
    const existingUser = await db.findOneBy(User, { email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await this.hashPassword(password);
    const user = await db.save(User, {
      name,
      email,
      passwordHash,
    });

    return user;
  }

  async authenticateUser(email: string, password: string): Promise<User> {
    const db = getDB();

    // Need to explicitly select passwordHash since it's excluded by default
    const user = await db
      .createQueryBuilder(User, 'user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      throw new Error('Invalid login credentials');
    }

    const isValidPassword = await this.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid login credentials');
    }

    return user;
  }

  /**
   * Resets a user's password. Verifies the current password before applying.
   * Clears the requiresPasswordReset flag on success.
   */
  async resetPassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const db = getDB();
    const user = await db
      .createQueryBuilder(User, 'user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await this.verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    user.passwordHash = await this.hashPassword(newPassword);
    user.requiresPasswordReset = false;
    await db.save(User, user);
  }

  async requestResetPassword(email: string): Promise<void> {
    const db = getDB();
    const user = await db.findOneBy(User, { email });
    if (!user) {
      // For security, don't reveal whether the email exists or not
      console.warn(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    // Invalidate any existing reset tokens for this user
    await db
      .createQueryBuilder()
      .update(PasswordResetToken)
      .set({ used: true })
      .where('userId = :userId AND used = false', { userId: user.id })
      .execute();

    // Generate a one-time-use token
    const id = this.generateSecureRandomString();
    const secret = this.generateSecureRandomString();
    const secretHash = await this.hashSecret(secret);
    const token = `${id}.${secret}`;

    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MIN * 60 * 1000);

    await db.save(PasswordResetToken, {
      id,
      secretHash: Buffer.from(secretHash).toString('base64'),
      expiresAt,
      used: false,
      user,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password/token?token=${encodeURIComponent(token)}`;

    console.log('Sending password reset email to:', email);
    this.resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: 'Password Reset Request',
      html: `
        <p>Hi ${user.name},</p>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>This link expires in ${RESET_TOKEN_EXPIRY_MIN} minutes and can only be used once.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });
  }

  private async findValidResetToken(token: string): Promise<PasswordResetToken> {
    const parsed = this.parseToken(token);
    if (!parsed) throw new Error('Invalid reset token');
    const [tokenId, tokenSecret] = parsed;

    const db = getDB();
    const resetToken = await db.findOne(PasswordResetToken, {
      where: { id: tokenId },
      relations: ['user'],
    });

    if (!resetToken) throw new Error('Invalid reset token');
    if (resetToken.used) throw new Error('Reset token has already been used');
    if (new Date() > resetToken.expiresAt) throw new Error('Reset token has expired');

    const secretHash = await this.hashSecret(tokenSecret);
    const isValid = this.constantTimeEqual(
      secretHash,
      new Uint8Array(Buffer.from(resetToken.secretHash, 'base64'))
    );
    if (!isValid) throw new Error('Invalid reset token');

    return resetToken;
  }

  /**
   * Validates a password-reset token (id.secret format).
   * Returns the associated user if the token is valid, unused, and not expired.
   * Does NOT mark it as used — call resetPasswordWithToken to consume it.
   */
  async validateResetToken(token: string): Promise<User | null> {
    try {
      const resetToken = await this.findValidResetToken(token);
      return resetToken.user;
    } catch {
      return null;
    }
  }

  /**
   * Resets a user's password using a valid reset token.
   * Marks the token as used so it cannot be reused.
   * Returns the user so the caller can create a session.
   */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<User> {
    const resetToken = await this.findValidResetToken(token);
    const db = getDB();

    const user = resetToken.user;
    user.passwordHash = await this.hashPassword(newPassword);
    user.requiresPasswordReset = false;
    resetToken.used = true;

    await db.save(User, user);
    await db.save(PasswordResetToken, resetToken);

    return user;
  }
  async createSession(user: Partial<User>): Promise<SessionWithToken> {
    // validate user
    if (!user.id) {
      throw new Error('Invalid user');
    }

    const db = getDB();
    const validatedUser = await db.findOneBy(User, { id: user.id });
    if (!validatedUser) {
      throw new Error('Invalid user');
    }

    // create a session for the user
    const id = this.generateSecureRandomString();
    const secret = this.generateSecureRandomString();
    const secretHash = await this.hashSecret(secret);

    const savedSession = await db.save(Session, {
      id: id,
      secretHash: Buffer.from(secretHash).toString('base64'),
      user: validatedUser,
    });

    const session: SessionWithToken = {
      ...savedSession,
      token: `${savedSession.id}.${secret}`,
    };

    return session;
  }
  async getSession(sessionId: string): Promise<Session | null> {
    const now = new Date();
    const db = getDB();

    const session = await db.findOne(Session, {
      where: { id: sessionId },
      relations: ['user'],
    });

    if (!session) {
      return null;
    }

    // Check expiration
    if (now.getTime() - session.createdAt.getTime() >= SESSION_TIMEOUT_SEC * 1000) {
      await this.deleteSession(sessionId);
      return null;
    }

    return session;
  }
  async deleteSession(sessionId: string): Promise<void> {
    const db = getDB();
    await db.delete(Session, { id: sessionId });
  }
  /**
   * Invalidate a session given a full session token (id.secret).
   * Extracts the session ID and deletes it.
   */
  async invalidateSessionByToken(token: string): Promise<void> {
    const parsed = this.parseToken(token);
    if (parsed) {
      await this.deleteSession(parsed[0]);
    }
  }
  async listUsers(): Promise<User[]> {
    const db = getDB();
    const users = await db.find(User);
    return users;
  }

  /**
   * Seeds an initial admin user from environment variables.
   * Reads ADMIN_NAME and ADMIN_EMAIL (no password in env).
   * - If both are set and no user with that email exists, creates an admin with
   *   a random temporary password (printed to the console once) and sets
   *   requiresPasswordReset = true.
   * - If the user already exists, ensures their role is ADMIN.
   * - If the env vars are not set, does nothing.
   */
  async seedAdminUser(): Promise<void> {
    const name = process.env.ADMIN_NAME;
    const email = process.env.ADMIN_EMAIL;

    if (!email || !name) {
      return; // Env vars not configured — skip seeding
    }

    const db = getDB();
    const existing = await db.findOneBy(User, { email });

    if (existing) {
      if (existing.role !== Role.ADMIN) {
        existing.role = Role.ADMIN;
        await db.save(User, existing);
        console.log(`Promoted existing user ${email} to ADMIN.`);
      }
      return;
    }

    // Generate a cryptographically random temporary password
    const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    const tempPassword = Array.from(bytes, b => alphabet[b % alphabet.length]).join('');

    const passwordHash = await this.hashPassword(tempPassword);
    await db.save(User, {
      name,
      email,
      passwordHash,
      role: Role.ADMIN,
      requiresPasswordReset: true,
    });

    console.log(`\n┌──────────────────────────────────────────────┐`);
    console.log(`│  Seeded admin user: ${email}`);
    console.log(`│  Temporary password: ${tempPassword}`);
    console.log(`│  You will be prompted to change this on first login.`);
    console.log(`└──────────────────────────────────────────────┘\n`);
  }
}
