import { Express } from 'express';
import { z } from 'zod';
import { createEndpoint } from '../utils/createEndpoint';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/api';
import type { Vendor, AssignVendorRequest } from 'shared';
import { ApiError } from 'shared';
import { VendorService } from '../services/vendorService';

const SearchVendorSchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const CreateVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  url: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
});

const UpdateVendorSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
});

const AssignVendorSchema = z.object({
  vendorId: z.string().uuid().nullable(),
});

const vendorService = new VendorService();

export function vendorRoutes(app: Express) {
  // GET /api/vendors/search?query=...&limit=20 — Search vendors
  app.get(
    '/api/vendors/search',
    requireAuth(),
    createEndpoint<z.infer<typeof SearchVendorSchema>, Vendor[], AuthenticatedRequest>({
      inputSource: 'query',
      schema: SearchVendorSchema,
      handler: async (input): Promise<Vendor[]> => {
        return vendorService.searchVendors(input.query, input.limit);
      },
    })
  );

  // POST /api/vendors — Create vendor
  app.post(
    '/api/vendors',
    requireAuth(),
    createEndpoint<z.infer<typeof CreateVendorSchema>, Vendor, AuthenticatedRequest>({
      schema: CreateVendorSchema,
      handler: async (input, req): Promise<Vendor> => {
        return vendorService.createVendor(input, req.user);
      },
    })
  );

  // GET /api/vendors/:id — Get single vendor
  app.get(
    '/api/vendors/:id',
    requireAuth(),
    createEndpoint<unknown, Vendor, AuthenticatedRequest>({
      inputSource: 'query',
      handler: async (_input, req): Promise<Vendor> => {
        const vendor = await vendorService.getVendorById(req.params.id);
        if (!vendor) {
          throw new ApiError('Vendor not found', 404);
        }
        return vendor;
      },
    })
  );

  // PUT /api/vendors/:id — Update vendor
  app.put(
    '/api/vendors/:id',
    requireAuth(),
    createEndpoint<z.infer<typeof UpdateVendorSchema>, Vendor, AuthenticatedRequest>({
      schema: UpdateVendorSchema,
      handler: async (input, req): Promise<Vendor> => {
        return vendorService.updateVendor(req.params.id, input, req.user);
      },
    })
  );

  // PATCH /api/transactions/:id/vendor — Assign vendor to transaction
  app.patch(
    '/api/transactions/:id/vendor',
    requireAuth(),
    createEndpoint<z.infer<typeof AssignVendorSchema>, { updated: boolean }, AuthenticatedRequest>({
      schema: AssignVendorSchema,
      handler: async (input, req): Promise<{ updated: boolean }> => {
        await vendorService.assignVendorToTransaction(req.params.id, input.vendorId, req.user);
        return { updated: true };
      },
    })
  );
}
