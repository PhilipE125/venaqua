REVOKE UPDATE ON public.api_keys FROM authenticated;
GRANT UPDATE (revoked_at) ON public.api_keys TO authenticated;