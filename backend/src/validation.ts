import {z} from 'zod';
export const isLoginPayload=(value:string):boolean=>/^![^!\s]+![\s\S]+$/.test(value.trim());
export const readingInput=z.object({
 device_event_id:z.string().trim().min(1).max(128),
 device_id:z.string().uuid(),
 location_id:z.string().uuid(),
 camera_id:z.string().uuid().nullable().optional(),
 code:z.string().trim().min(1).max(512),
 occurred_at:z.string().datetime({offset:true})
});
export const pagination=z.object({
 limit:z.coerce.number().int().min(1).max(100).default(25),
 offset:z.coerce.number().int().min(0).default(0)
});
