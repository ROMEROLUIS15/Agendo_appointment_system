// Mock data for development — no database required
import type {
  Appointment, Client, Service, User, Business,
  Transaction, Expense, DashboardStats, FinanceSummary,
} from '@/types'

const BUSINESS_ID = 'biz-001'
const USER_ID = 'usr-001'

export const mockBusiness: Business = {
  id: BUSINESS_ID,
  owner_id: USER_ID,
  name: 'Barber Elite',
  slug: 'barber-elite',
  category: 'Barbería',
  phone: '+573001234567',
  address: 'Calle 72 # 10-15, Bogotá',
  plan: 'pro',
  timezone: 'America/Bogota',
  locale: 'es',
  logo_url: null,
  settings: {
    notifications: { whatsapp: true, email: true, reminderHours: [24, 2] },
    workingHours: {
      mon: ['09:00', '18:00'], tue: ['09:00', '18:00'],
      wed: ['09:00', '18:00'], thu: ['09:00', '18:00'],
      fri: ['09:00', '18:00'], sat: ['09:00', '14:00'], sun: null,
    },
    maxDailyBookingsPerClient: 2,
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockUsers: User[] = [
  {
    id: USER_ID,
    business_id: BUSINESS_ID,
    role: 'owner',
    name: 'Carlos Martínez',
    phone: '+573001234567',
    email: null,
    avatar_url: null,
    color: '#EA580C',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'usr-002',
    business_id: BUSINESS_ID,
    role: 'employee',
    name: 'Andrés López',
    phone: '+573009874321',
    email: null,
    avatar_url: null,
    color: '#3B82F6',
    is_active: true,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
]

export const mockServices: Service[] = [
  { id: 'svc-001', business_id: BUSINESS_ID, name: 'Corte clásico',      duration_min: 30, price: 25000, color: '#EA580C', is_active: true, category: null, description: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'svc-002', business_id: BUSINESS_ID, name: 'Corte + Barba',      duration_min: 45, price: 38000, color: '#C2410C', is_active: true, category: null, description: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'svc-003', business_id: BUSINESS_ID, name: 'Coloración',         duration_min: 90, price: 80000, color: '#F97316', is_active: true, category: null, description: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'svc-004', business_id: BUSINESS_ID, name: 'Afeitado clásico',   duration_min: 30, price: 20000, color: '#FB923C', is_active: true, category: null, description: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'svc-005', business_id: BUSINESS_ID, name: 'Tratamiento capilar', duration_min: 60, price: 55000, color: '#7C2D12', is_active: true, category: null, description: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
]

export const mockClients: Client[] = [
  {
    id: 'cli-001', business_id: BUSINESS_ID, name: 'Juan Pérez',
    phone: '+573001111111', email: 'juan@mail.com', tags: ['VIP', 'frecuente'],
    total_appointments: 24, total_spent: 720000,
    last_visit_at: '2024-03-01T14:00:00Z',
    avatar_url: null, birthday: null, deleted_at: null, notes: null,
    created_at: '2024-01-05T00:00:00Z', updated_at: '2024-03-01T00:00:00Z',
  },
  {
    id: 'cli-002', business_id: BUSINESS_ID, name: 'Luis García',
    phone: '+573002222222', email: null, tags: [],
    total_appointments: 8, total_spent: 290000,
    last_visit_at: '2024-02-25T11:00:00Z',
    avatar_url: null, birthday: null, deleted_at: null, notes: null,
    created_at: '2024-01-20T00:00:00Z', updated_at: '2024-02-25T00:00:00Z',
  },
  {
    id: 'cli-003', business_id: BUSINESS_ID, name: 'Alejandro Torres',
    phone: '+573003333333', email: 'ale@mail.com', tags: ['nuevo'],
    total_appointments: 3, total_spent: 90000,
    last_visit_at: '2024-03-02T16:00:00Z',
    avatar_url: null, birthday: null, deleted_at: null, notes: null,
    created_at: '2024-02-10T00:00:00Z', updated_at: '2024-03-02T00:00:00Z',
  },
  {
    id: 'cli-004', business_id: BUSINESS_ID, name: 'Sebastián Ruiz',
    phone: '+573004444444', email: null, tags: ['VIP'],
    total_appointments: 15, total_spent: 540000,
    last_visit_at: '2024-03-03T10:00:00Z',
    avatar_url: null, birthday: null, deleted_at: null, notes: null,
    created_at: '2024-01-10T00:00:00Z', updated_at: '2024-03-03T00:00:00Z',
  },
  {
    id: 'cli-005', business_id: BUSINESS_ID, name: 'Miguel Hernández',
    phone: '+573005555555', email: null, tags: [],
    total_appointments: 6, total_spent: 188000,
    last_visit_at: '2024-02-20T09:00:00Z',
    avatar_url: null, birthday: null, deleted_at: null, notes: null,
    created_at: '2024-01-25T00:00:00Z', updated_at: '2024-02-20T00:00:00Z',
  },
]

// Today's appointments
const today = new Date()
const todayStr = today.toISOString().split('T')[0]

export const mockAppointments: Appointment[] = [
  {
    id: 'apt-001', business_id: BUSINESS_ID,
    client_id: 'cli-001',
    client: { id: 'cli-001', name: 'Juan Pérez', phone: '+573001111111', avatar_url: null },
    service_id: 'svc-002',
    service: { id: 'svc-002', name: 'Corte + Barba', color: '#C2410C', duration_min: 45, price: 38000 },
    assigned_user_id: USER_ID,
    assigned_user: { id: USER_ID, name: 'Carlos Martínez', color: '#EA580C', avatar_url: null },
    start_at: `${todayStr}T09:00:00Z`, end_at: `${todayStr}T09:45:00Z`,
    status: 'confirmed', is_dual_booking: false,
    notes: null, cancel_reason: null, cancelled_at: null,
    created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T00:00:00Z',
  },
  {
    id: 'apt-002', business_id: BUSINESS_ID,
    client_id: 'cli-002',
    client: { id: 'cli-002', name: 'Luis García', phone: '+573002222222', avatar_url: null },
    service_id: 'svc-001',
    service: { id: 'svc-001', name: 'Corte clásico', color: '#EA580C', duration_min: 30, price: 25000 },
    assigned_user_id: 'usr-002',
    assigned_user: { id: 'usr-002', name: 'Andrés López', color: '#3B82F6', avatar_url: null },
    start_at: `${todayStr}T10:00:00Z`, end_at: `${todayStr}T10:30:00Z`,
    status: 'pending', is_dual_booking: false,
    notes: null, cancel_reason: null, cancelled_at: null,
    created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T00:00:00Z',
  },
  {
    id: 'apt-003', business_id: BUSINESS_ID,
    client_id: 'cli-004',
    client: { id: 'cli-004', name: 'Sebastián Ruiz', phone: '+573004444444', avatar_url: null },
    service_id: 'svc-003',
    service: { id: 'svc-003', name: 'Coloración', color: '#F97316', duration_min: 90, price: 80000 },
    assigned_user_id: USER_ID,
    assigned_user: { id: USER_ID, name: 'Carlos Martínez', color: '#EA580C', avatar_url: null },
    start_at: `${todayStr}T11:00:00Z`, end_at: `${todayStr}T12:30:00Z`,
    status: 'confirmed', is_dual_booking: false,
    notes: null, cancel_reason: null, cancelled_at: null,
    created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T00:00:00Z',
  },
  {
    id: 'apt-004', business_id: BUSINESS_ID,
    client_id: 'cli-001',
    client: { id: 'cli-001', name: 'Juan Pérez', phone: '+573001111111', avatar_url: null },
    service_id: 'svc-005',
    service: { id: 'svc-005', name: 'Tratamiento capilar', color: '#7C2D12', duration_min: 60, price: 55000 },
    assigned_user_id: USER_ID,
    assigned_user: { id: USER_ID, name: 'Carlos Martínez', color: '#EA580C', avatar_url: null },
    start_at: `${todayStr}T15:00:00Z`, end_at: `${todayStr}T16:00:00Z`,
    status: 'pending', is_dual_booking: true,
    notes: null, cancel_reason: null, cancelled_at: null,
    created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T00:00:00Z',
  },
  {
    id: 'apt-005', business_id: BUSINESS_ID,
    client_id: 'cli-003',
    client: { id: 'cli-003', name: 'Alejandro Torres', phone: '+573003333333', avatar_url: null },
    service_id: 'svc-004',
    service: { id: 'svc-004', name: 'Afeitado clásico', color: '#FB923C', duration_min: 30, price: 20000 },
    assigned_user_id: 'usr-002',
    assigned_user: { id: 'usr-002', name: 'Andrés López', color: '#3B82F6', avatar_url: null },
    start_at: `${todayStr}T16:00:00Z`, end_at: `${todayStr}T16:30:00Z`,
    status: 'completed', is_dual_booking: false,
    notes: null, cancel_reason: null, cancelled_at: null,
    created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T00:00:00Z',
  },
]

export const mockTransactions: Transaction[] = [
  {
    id: 'txn-001', business_id: BUSINESS_ID, appointment_id: 'apt-005',
    amount: 38000, discount: 0, tip: 5000, net_amount: 43000,
    method: 'cash', notes: null,
    paid_at: '2024-03-04T09:45:00Z', created_at: '2024-03-04T09:45:00Z',
  },
  {
    id: 'txn-002', business_id: BUSINESS_ID, appointment_id: 'apt-003',
    amount: 80000, discount: 10, tip: 0, net_amount: 72000,
    method: 'card', notes: null,
    paid_at: '2024-03-03T12:30:00Z', created_at: '2024-03-03T12:30:00Z',
  },
]

export const mockExpenses: Expense[] = [
  {
    id: 'exp-001', business_id: BUSINESS_ID,
    amount: 150000, category: 'supplies',
    description: 'Productos de barbería',
    expense_date: '2024-03-01', receipt_url: null,
    created_by: USER_ID, created_at: '2024-03-01T10:00:00Z',
  },
  {
    id: 'exp-002', business_id: BUSINESS_ID,
    amount: 800000, category: 'rent',
    description: 'Arriendo local marzo',
    expense_date: '2024-03-01', receipt_url: null,
    created_by: USER_ID, created_at: '2024-03-01T10:00:00Z',
  },
]

export const mockFinanceSummary: FinanceSummary = {
  totalRevenue:    115000,
  totalExpenses:   950000,
  netProfit:       -835000,
  pendingPayments: 0,
  transactionCount: 2,
}

export const mockDashboardStats: DashboardStats = {
  appointmentsToday:    5,
  appointmentsThisWeek: 18,
  totalClients:         mockClients.length,
  revenueThisMonth:     mockFinanceSummary.totalRevenue,
  pendingAppointments:  2,
  completedToday:       1,
}
