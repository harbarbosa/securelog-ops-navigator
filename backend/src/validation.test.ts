import {describe,it,expect} from 'vitest';
import {pagination,readingInput} from './validation.js';
describe('backend input validation',()=>{
 it('rejects invalid pagination',()=>{expect(pagination.safeParse({limit:101}).success).toBe(false);});
 it('uses safe pagination defaults',()=>{expect(pagination.parse({})).toEqual({limit:25,offset:0});});
 it('rejects empty reading codes',()=>{
  expect(readingInput.safeParse({device_event_id:'event',device_id:'9b87254d-cf15-4ca6-95a7-1a26d16c733d',location_id:'9b87254d-cf15-4ca6-95a7-1a26d16c733d',code:' ',occurred_at:'2026-11-09T12:00:00-03:00'}).success).toBe(false);
 });
});
