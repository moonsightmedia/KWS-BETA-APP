-- Make difficulty nullable to support "?" (unknown/not rated) as a difficulty option
ALTER TABLE public.boulders
  ALTER COLUMN difficulty DROP NOT NULL;

