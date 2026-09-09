CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own profile write" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'Remote',
  description TEXT NOT NULL DEFAULT '',
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  experience_level TEXT NOT NULL DEFAULT 'Entry',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read jobs" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "admins manage jobs" ON public.jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT,
  extracted_text TEXT NOT NULL DEFAULT '',
  skills TEXT[] NOT NULL DEFAULT '{}',
  education JSONB NOT NULL DEFAULT '[]'::jsonb,
  experience JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resumes TO authenticated;
GRANT ALL ON public.resumes TO service_role;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own resumes" ON public.resumes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  matches JSONB NOT NULL DEFAULT '[]'::jsonb,
  top_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analyses TO authenticated;
GRANT ALL ON public.analyses TO service_role;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own analyses" ON public.analyses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO public.jobs (title, company, location, description, required_skills, experience_level) VALUES
('Frontend Developer','Nimbus Labs','Bangalore, India','Build responsive web interfaces with React and modern tooling.', ARRAY['JavaScript','React','HTML','CSS','TypeScript','Git','REST API'],'Entry'),
('Backend Developer','Corvus Systems','Hyderabad, India','Design and maintain REST APIs and databases.', ARRAY['Node.js','Express','MongoDB','SQL','REST API','Git','Docker'],'Mid'),
('Full Stack Engineer','Brightwave','Remote','End-to-end feature ownership across frontend and backend.', ARRAY['React','Node.js','TypeScript','PostgreSQL','REST API','Git','AWS'],'Mid'),
('Data Analyst','Meridian Analytics','Pune, India','Turn raw data into dashboards and business insight.', ARRAY['SQL','Python','Excel','Pandas','Power BI','Statistics'],'Entry'),
('Machine Learning Engineer','Axiom AI','Remote','Train, evaluate and deploy ML models to production.', ARRAY['Python','TensorFlow','PyTorch','Scikit-learn','NLP','Docker','SQL'],'Mid'),
('Data Scientist','Helix Data','Mumbai, India','Statistical modelling and experimentation at scale.', ARRAY['Python','Statistics','Machine Learning','SQL','Pandas','Data Visualization'],'Mid'),
('DevOps Engineer','Cloudpine','Remote','Own CI/CD pipelines and cloud infrastructure.', ARRAY['Docker','Kubernetes','AWS','Linux','CI/CD','Terraform','Bash'],'Mid'),
('Mobile App Developer','Kite Mobile','Chennai, India','Ship cross-platform mobile apps.', ARRAY['React Native','JavaScript','TypeScript','REST API','Firebase','Git'],'Entry'),
('QA Automation Engineer','Sentinel QA','Remote','Automate regression suites for web products.', ARRAY['Selenium','JavaScript','Cypress','Testing','Git','CI/CD'],'Entry'),
('Cloud Engineer','Stratus Works','Noida, India','Design secure, cost-efficient cloud architecture.', ARRAY['AWS','Azure','Terraform','Linux','Networking','Python'],'Mid'),
('UI/UX Designer','Form & Function','Remote','Design clean, accessible product interfaces.', ARRAY['Figma','UI Design','UX Research','Prototyping','HTML','CSS'],'Entry'),
('Cybersecurity Analyst','Ironvault','Delhi, India','Monitor threats and harden company systems.', ARRAY['Network Security','Linux','Python','SIEM','Incident Response','Cryptography'],'Mid');