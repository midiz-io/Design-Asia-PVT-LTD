-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'employee', 'manager', 'supervisor');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE movement_type AS ENUM ('transfer', 'delivery', 'return', 'adjustment');
CREATE TYPE alert_type AS ENUM ('low_stock', 'reorder', 'location_breach', 'movement');

-- User Profiles Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    department TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Roles Table (CRITICAL: Separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role user_role NOT NULL DEFAULT 'employee',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Tasks Table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    status task_status DEFAULT 'pending',
    priority task_priority DEFAULT 'medium',
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    location_required BOOLEAN DEFAULT false,
    geofence_id UUID,
    requires_proof BOOLEAN DEFAULT false,
    proof_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Assignees Table (many-to-many)
CREATE TABLE public.task_assignees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, user_id)
);

-- Task Attachments Table
CREATE TABLE public.task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofences Table
CREATE TABLE public.geofences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee Locations Table (for real-time tracking)
CREATE TABLE public.employee_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    battery_level INTEGER,
    is_active BOOLEAN DEFAULT true
);

-- Chat Messages Table
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Petty Cash Categories
CREATE TABLE public.petty_cash_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    budget_limit DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Petty Cash Transactions
CREATE TABLE public.petty_cash_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES auth.users(id) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category_id UUID REFERENCES public.petty_cash_categories(id),
    description TEXT,
    receipt_url TEXT,
    receipt_text TEXT,
    status expense_status DEFAULT 'pending',
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    task_id UUID REFERENCES public.tasks(id),
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Petty Cash Budgets
CREATE TABLE public.petty_cash_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES auth.users(id) NOT NULL,
    category_id UUID REFERENCES public.petty_cash_categories(id) NOT NULL,
    monthly_limit DECIMAL(10,2) NOT NULL,
    current_spent DECIMAL(10,2) DEFAULT 0,
    reset_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, category_id)
);

-- Inventory Items
CREATE TABLE public.inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT UNIQUE,
    category TEXT,
    unit_price DECIMAL(10,2),
    reorder_level INTEGER DEFAULT 0,
    max_stock_level INTEGER,
    unit_of_measure TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Locations (Geofenced Zones)
CREATE TABLE public.inventory_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    geofence_id UUID REFERENCES public.geofences(id),
    location_type TEXT,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    capacity INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock Levels by Location
CREATE TABLE public.stock_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID REFERENCES public.inventory_items(id) NOT NULL,
    location_id UUID REFERENCES public.inventory_locations(id) NOT NULL,
    current_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    last_counted_at TIMESTAMPTZ,
    last_movement_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(inventory_item_id, location_id)
);

-- Stock Movements
CREATE TABLE public.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID REFERENCES public.inventory_items(id) NOT NULL,
    from_location_id UUID REFERENCES public.inventory_locations(id),
    to_location_id UUID REFERENCES public.inventory_locations(id),
    quantity INTEGER NOT NULL,
    movement_type movement_type NOT NULL,
    reference_number TEXT,
    employee_id UUID REFERENCES auth.users(id) NOT NULL,
    task_id UUID REFERENCES public.tasks(id),
    notes TEXT,
    geofence_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Alerts
CREATE TABLE public.inventory_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID REFERENCES public.inventory_items(id) NOT NULL,
    location_id UUID REFERENCES public.inventory_locations(id),
    alert_type alert_type NOT NULL,
    threshold_value INTEGER,
    current_value INTEGER,
    message TEXT,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_alerts ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
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

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for tasks
CREATE POLICY "Users can view assigned tasks or created tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.task_assignees
    WHERE task_id = tasks.id AND user_id = auth.uid()
  ) OR
  public.is_admin(auth.uid())
);

CREATE POLICY "Admins can create tasks"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update tasks"
ON public.tasks FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Assigned users can update task status"
ON public.tasks FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.task_assignees
    WHERE task_id = tasks.id AND user_id = auth.uid()
  )
);

-- RLS Policies for task_assignees
CREATE POLICY "Users can view task assignments"
ON public.task_assignees FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR
  public.is_admin(auth.uid())
);

CREATE POLICY "Admins can manage task assignments"
ON public.task_assignees FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for task_attachments
CREATE POLICY "Users can view attachments for their tasks"
ON public.task_attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    LEFT JOIN public.task_assignees ta ON t.id = ta.task_id
    WHERE t.id = task_attachments.task_id
    AND (t.created_by = auth.uid() OR ta.user_id = auth.uid() OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "Users can upload attachments to their tasks"
ON public.task_attachments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

-- RLS Policies for geofences
CREATE POLICY "All users can view geofences"
ON public.geofences FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage geofences"
ON public.geofences FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for employee_locations
CREATE POLICY "Users can view all employee locations"
ON public.employee_locations FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Users can insert own location"
ON public.employee_locations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own location"
ON public.employee_locations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view their messages"
ON public.chat_messages FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can send messages"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- RLS Policies for petty_cash_categories
CREATE POLICY "All users can view categories"
ON public.petty_cash_categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.petty_cash_categories FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for petty_cash_transactions
CREATE POLICY "Users can view own transactions or all if admin"
ON public.petty_cash_transactions FOR SELECT
TO authenticated
USING (auth.uid() = employee_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create own transactions"
ON public.petty_cash_transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Users can update own pending transactions"
ON public.petty_cash_transactions FOR UPDATE
TO authenticated
USING (auth.uid() = employee_id AND status = 'pending');

CREATE POLICY "Admins can approve/reject transactions"
ON public.petty_cash_transactions FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for petty_cash_budgets
CREATE POLICY "Users can view own budgets or all if admin"
ON public.petty_cash_budgets FOR SELECT
TO authenticated
USING (auth.uid() = employee_id OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage budgets"
ON public.petty_cash_budgets FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for inventory_items
CREATE POLICY "All users can view inventory items"
ON public.inventory_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage inventory items"
ON public.inventory_items FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for inventory_locations
CREATE POLICY "All users can view inventory locations"
ON public.inventory_locations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage inventory locations"
ON public.inventory_locations FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for stock_levels
CREATE POLICY "All users can view stock levels"
ON public.stock_levels FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage stock levels"
ON public.stock_levels FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for stock_movements
CREATE POLICY "Users can view all stock movements"
ON public.stock_movements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can record stock movements"
ON public.stock_movements FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Admins can manage stock movements"
ON public.stock_movements FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for inventory_alerts
CREATE POLICY "All users can view inventory alerts"
ON public.inventory_alerts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can create alerts"
ON public.inventory_alerts FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can resolve alerts"
ON public.inventory_alerts FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email
  );
  
  -- Assign default employee role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_geofences_updated_at BEFORE UPDATE ON public.geofences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_petty_cash_transactions_updated_at BEFORE UPDATE ON public.petty_cash_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_petty_cash_budgets_updated_at BEFORE UPDATE ON public.petty_cash_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_levels_updated_at BEFORE UPDATE ON public.stock_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_alerts;

-- Create indexes for performance
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_task_assignees_user_id ON public.task_assignees(user_id);
CREATE INDEX idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX idx_employee_locations_user_id ON public.employee_locations(user_id);
CREATE INDEX idx_employee_locations_timestamp ON public.employee_locations(timestamp DESC);
CREATE INDEX idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX idx_chat_messages_receiver ON public.chat_messages(receiver_id);
CREATE INDEX idx_petty_cash_transactions_employee ON public.petty_cash_transactions(employee_id);
CREATE INDEX idx_petty_cash_transactions_status ON public.petty_cash_transactions(status);
CREATE INDEX idx_stock_movements_employee ON public.stock_movements(employee_id);
CREATE INDEX idx_stock_movements_item ON public.stock_movements(inventory_item_id);