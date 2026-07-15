-- Bu proje pupabase de badoo scheması altında çalışıyor. Public schema da değil.


create table badoo.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  nickname text,
  bio text,
  profile_image_url text,
  profile_image_thumb_url text,
  birth_year integer,
  gender text,
  height integer,
  weight integer,
  daily_calorie_goal integer,
  daily_protein_goal integer,
  daily_water_goal integer,
  daily_activity_goal integer default 10000,
  daily_activity_goal_type text default 'steps',
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

create table badoo.conditions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  condition_name text,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table badoo.food_sensitivities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  sensitivity_name text,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table badoo.foods (
  id uuid primary key default uuid_generate_v4(),
  food_name text,
  unit_type text not null default 'gram',
  calories integer,
  protein integer,
  carbohydrates integer,
  fats integer
);

create table badoo.food_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  food_id uuid references badoo.foods(id) on delete cascade,
  quantity numeric,
  meal_title text,
  image_url text,
  image_path text,
  calories integer,
  protein integer,
  carbohydrates integer,
  fats integer,
  timestamp timestamptz,
  deleted_at timestamptz
);

create table badoo.water_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  amount integer,
  timestamp timestamptz
);

create table badoo.drink_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  drink_name text,
  timestamp timestamptz
);

create table badoo.medications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  medication_name text,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table badoo.medication_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  medication_id uuid references badoo.medications(id) on delete cascade,
  dose text,
  timestamp timestamptz
);

create table badoo.symptom_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  symptom_name text,
  severity integer,
  note text,
  timestamp timestamptz
);

create table badoo.stool_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  time timestamptz,
  consistency text,
  note text
);

create table badoo.sleep_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  hours integer,
  duration_minutes integer,
  quality integer,
  wake_count integer,
  timestamp timestamptz
);

create table badoo.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  activity_name text,
  duration integer,
  distance numeric,
  steps integer,
  source text not null default 'manual',
  timestamp timestamptz
);

create table badoo.daily_status_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  energy integer,
  stress integer,
  mood integer,
  motivation integer,
  timestamp timestamptz
);

create table badoo.notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  note text,
  timestamp timestamptz
);

create table badoo.daily_tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  task_name text,
  completed boolean
);

create table badoo.goal_options (
  id uuid primary key default uuid_generate_v4(),
  goal_key text unique not null,
  goal_name text not null,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table badoo.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  goal_option_id uuid references badoo.goal_options(id) on delete cascade,
  goal_name text,
  created_at timestamptz default now()
);

create table badoo.common_sensitivity_foods (
  id uuid primary key default uuid_generate_v4(),
  food_key text unique not null,
  food_name text not null,
  emoji text,
  keywords text[] not null default '{}',
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table badoo.period_symptom_options (
  id uuid primary key default uuid_generate_v4(),
  symptom_key text unique not null,
  symptom_name text not null,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table badoo.period_cycles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  start_date date not null,
  end_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table badoo.period_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  cycle_id uuid references badoo.period_cycles(id) on delete cascade,
  log_type text not null,
  symptom_option_id uuid references badoo.period_symptom_options(id) on delete set null,
  symptom_name text,
  flow_level text,
  note text,
  logged_at timestamptz default now()
);

create table badoo.device_push_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  fcm_token text not null,
  platform text not null default 'ios',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, fcm_token)
);

create table badoo.friendships (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid not null,
  addressee_id uuid not null,
  status text not null default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint friendships_no_self check (requester_id != addressee_id),
  constraint friendships_status_check check (status in ('pending', 'accepted', 'rejected'))
);

create unique index friendships_pair_unique on badoo.friendships (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);

create table badoo.friend_notes (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null,
  receiver_id uuid not null,
  message text not null,
  duration_hours integer not null default 8,
  expires_at timestamptz not null,
  parent_note_id uuid references badoo.friend_notes(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz default now()
);

create table badoo.friend_nudges (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null,
  receiver_id uuid not null,
  created_at timestamptz default now()
);

create table badoo.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  sender_id uuid,
  type text not null,
  title text not null,
  body text,
  payload jsonb default '{}',
  read_at timestamptz,
  created_at timestamptz default now()
);

create table badoo.health_ai_analyses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  title text not null,
  summary text,
  analysis_text text not null,
  input_snapshot jsonb default '{}',
  period_start date not null,
  period_end date not null,
  model text default 'gpt-4o-mini',
  status text not null default 'completed',
  created_at timestamptz default now()
);