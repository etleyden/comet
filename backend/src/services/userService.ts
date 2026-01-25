import Session from "../entities/Session";
import { getDB } from "../data-source";
import User from "../entities/User";
import bcrypt from "bcrypt";

interface SessionWithToken extends Session {
    token: string;
}

const SESSION_TIMEOUT_SEC = 60 * 60 * 24; // 1 day
const BCRYPT_SALT_ROUNDS = 10;

export class UserService {
    /**
     * Generates sesssion IDs and secrets using 120 bits of entropy. See more: https://lucia-auth.com/sessions/basic
     * @returns a cryptographically secure random string
     */
    private generateSecureRandomString(): string {
        // Human readable alphabet (a-z, 0-9 without l, o, 0, 1 to avoid confusion)
        const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";

        // Generate 24 bytes = 192 bits of entropy.
        // We're only going to use 5 bits per byte so the total entropy will be 192 * 5 / 8 = 120 bits
        const bytes = new Uint8Array(24);
        crypto.getRandomValues(bytes);

        let id = "";
        for (let i = 0; i < bytes.length; i++) {
            // >> 3 "removes" the right-most 3 bits of the byte
            id += alphabet[bytes[i] >> 3];
        }
        return id;
    }
    private async hashSecret(secret: string): Promise<Uint8Array> {
        const secretBytes = new TextEncoder().encode(secret);
        const secretHashBuffer = await crypto.subtle.digest("SHA-256", secretBytes);
        return new Uint8Array(secretHashBuffer);
    }
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
        const tokenParts = token.split(".");
        if (tokenParts.length !== 2) {
            return null;
        }
        const sessionId = tokenParts[0];
        const sessionSecret = tokenParts[1];

        const session = await this.getSession(sessionId);
        if (!session) {
            return null;
        }

        const tokenSecretHash = await this.hashSecret(sessionSecret);
        const validSecret = this.constantTimeEqual(tokenSecretHash, new Uint8Array(Buffer.from(session.secretHash, 'base64')));
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
            passwordHash
        });

        return user;
    }

    async authenticateUser(email: string, password: string): Promise<User> {
        const db = getDB();
        
        // Need to explicitly select passwordHash since it's excluded by default
        const user = await db.createQueryBuilder(User, "user")
            .addSelect("user.passwordHash")
            .where("user.email = :email", { email })
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
            user: validatedUser
        });

        const session: SessionWithToken = {
            ...savedSession,
            token: `${savedSession.id}.${secret}`
        };

        return session;
    }
    async getSession(sessionId: string): Promise<Session | null> {
        const now = new Date();
        const db = getDB();

        const session = await db.findOne(Session, {
            where: { id: sessionId },
            relations: ['user']
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
    async listUsers(): Promise<User[]> {
        const db = getDB();
        const users = await db.find(User);
        return users;
    }

}