-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger function to create profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at on profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create sectors table
CREATE TABLE public.sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  boulder_count INTEGER DEFAULT 0,
  next_schraubtermin TIMESTAMP WITH TIME ZONE,
  last_schraubtermin TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;

-- RLS for sectors: Everyone can read, only admins can modify
CREATE POLICY "Anyone can view sectors"
  ON public.sectors FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert sectors"
  ON public.sectors FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update sectors"
  ON public.sectors FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sectors"
  ON public.sectors FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_sectors_updated_at
  BEFORE UPDATE ON public.sectors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create boulders table
CREATE TABLE public.boulders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sector_id UUID REFERENCES public.sectors(id) ON DELETE CASCADE NOT NULL,
  difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 8),
  color TEXT NOT NULL,
  beta_video_url TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.boulders ENABLE ROW LEVEL SECURITY;

-- RLS for boulders: Everyone can read, only admins can modify
CREATE POLICY "Anyone can view boulders"
  ON public.boulders FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert boulders"
  ON public.boulders FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update boulders"
  ON public.boulders FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete boulders"
  ON public.boulders FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_boulders_updated_at
  BEFORE UPDATE ON public.boulders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert mock sectors data
INSERT INTO public.sectors (name, description, boulder_count, next_schraubtermin, last_schraubtermin, image_url) VALUES
  ('Blöcke Außenbereich', 'Die klassische Außenbereich mit vielseitigen Routen', 42, '2025-02-15 14:00:00+00', '2024-12-01 14:00:00+00', 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800'),
  ('Höhle', 'Technische und kraftintensive Boulder-Probleme', 38, '2025-02-22 14:00:00+00', '2024-11-28 14:00:00+00', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'),
  ('Dach', 'Overhang-Bereich für fortgeschrittene Kletterer', 25, '2025-03-01 14:00:00+00', '2024-12-05 14:00:00+00', 'https://images.unsplash.com/photo-1522163723043-478ef79a5bb4?w=800'),
  ('Turm', 'Vertikale Wand mit Ausdauer-Routen', 31, '2025-02-18 14:00:00+00', '2024-12-03 14:00:00+00', 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800'),
  ('Anfängerbereich', 'Perfekt für Einsteiger und zum Aufwärmen', 28, '2025-02-25 14:00:00+00', '2024-12-08 14:00:00+00', 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=800');