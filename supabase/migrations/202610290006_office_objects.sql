-- Fast workspace layout object loading and server-side transform validation.

create index if not exists office_objects_layout_created_idx
  on public.office_objects(office_layout_id, created_at);

alter table public.office_objects
  add constraint office_objects_asset_key_supported check (
    asset_key in ('planter','floor_lamp','lounge_bench','whiteboard','focus_pod')
  ) not valid;

alter table public.office_objects
  add constraint office_objects_transform_shape check (
    jsonb_typeof(transform) = 'object'
    and (transform ?& array['x','y','z','rotationY','scale'])
    and (transform->>'x')::numeric between -10.5 and 10.5
    and (transform->>'y')::numeric between 0 and 4
    and (transform->>'z')::numeric between -6.5 and 10.5
    and (transform->>'scale')::numeric between 0.5 and 2
  ) not valid;
