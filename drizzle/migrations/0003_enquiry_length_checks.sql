ALTER TABLE public.project_enquiries
  ADD CONSTRAINT enquiry_name_len CHECK (char_length(btrim(name)) BETWEEN 1 AND 100) NOT VALID,
  ADD CONSTRAINT enquiry_email_fmt CHECK (char_length(email) <= 255 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') NOT VALID,
  ADD CONSTRAINT enquiry_org_len CHECK (char_length(btrim(organisation)) BETWEEN 1 AND 200) NOT VALID,
  ADD CONSTRAINT enquiry_role_len CHECK (role IS NULL OR char_length(role) <= 200) NOT VALID,
  ADD CONSTRAINT enquiry_opp_len CHECK (opportunity IS NULL OR char_length(opportunity) <= 500) NOT VALID,
  ADD CONSTRAINT enquiry_help_len CHECK (char_length(btrim(help)) BETWEEN 1 AND 3000) NOT VALID;