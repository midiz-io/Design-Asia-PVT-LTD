-- Create Petty Cash IOU System
-- This migration creates tables for IOU (I Owe You) requests and settlements

-- IOU Requests Table
CREATE TABLE IF NOT EXISTS public.petty_cash_iou_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES auth.users(id) NOT NULL,
    requested_amount DECIMAL(10,2) NOT NULL,
    category_id UUID REFERENCES public.petty_cash_categories(id),
    purpose TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'issued')),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    issued_by UUID REFERENCES auth.users(id),
    issued_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- IOU Settlements Table
CREATE TABLE IF NOT EXISTS public.petty_cash_iou_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    iou_request_id UUID REFERENCES public.petty_cash_iou_requests(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES auth.users(id) NOT NULL,
    actual_expense_amount DECIMAL(10,2) NOT NULL,
    cash_returned DECIMAL(10,2) DEFAULT 0,
    additional_payment DECIMAL(10,2) DEFAULT 0,
    receipt_url TEXT,
    receipt_text TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    settled_at TIMESTAMPTZ,
    settled_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.petty_cash_iou_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_iou_settlements ENABLE ROW LEVEL SECURITY;

-- Policies for IOU Requests
DO $$ BEGIN
  CREATE POLICY "Users can view their own IOUs" ON public.petty_cash_iou_requests
  FOR SELECT TO authenticated USING (employee_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'supervisor')
  ));

  CREATE POLICY "Users can create their own IOUs" ON public.petty_cash_iou_requests
  FOR INSERT TO authenticated WITH CHECK (employee_id = auth.uid());

  CREATE POLICY "Admins can update all IOUs" ON public.petty_cash_iou_requests
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policies for IOU Settlements
DO $$ BEGIN
  CREATE POLICY "Users can view their own settlements" ON public.petty_cash_iou_settlements
  FOR SELECT TO authenticated USING (employee_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'supervisor')
  ));

  CREATE POLICY "Users can create their own settlements" ON public.petty_cash_iou_settlements
  FOR INSERT TO authenticated WITH CHECK (employee_id = auth.uid());

  CREATE POLICY "Admins can approve settlements" ON public.petty_cash_iou_settlements
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_iou_requests_employee ON public.petty_cash_iou_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_iou_requests_status ON public.petty_cash_iou_requests(status);
CREATE INDEX IF NOT EXISTS idx_iou_settlements_iou_id ON public.petty_cash_iou_settlements(iou_request_id);
CREATE INDEX IF NOT EXISTS idx_iou_settlements_employee ON public.petty_cash_iou_settlements(employee_id);

COMMENT ON TABLE public.petty_cash_iou_requests IS 'Stores IOU requests where employees request advances from petty cash';
COMMENT ON TABLE public.petty_cash_iou_settlements IS 'Stores IOU settlements where employees submit bills and settle the advance';

