export const CARRIERS = [
  'Aflac',
  'Americo',
  'Transamerica',
  'UHL (United Home Life)',
  'AHL (American Home Life)',
  'Mutual of Omaha',
  'Ethos',
  'Other',
] as const

export const PRODUCT_TYPES = [
  'Term Life',
  'Whole Life',
  'Final Expense',
  'Universal Life',
  'Indexed Universal Life (IUL)',
  'Annuity',
  'Medicare Supplement',
  'Medicare Advantage',
  'Health Insurance',
  'Accident Insurance',
  'Critical Illness',
  'Disability Income',
  'Other',
] as const

export const POLICY_STATUSES = [
  { value: 'pending',    label: 'Pending',    color: '#8B8B8B' },
  { value: 'submitted',  label: 'Submitted',  color: '#C9A96E' },
  { value: 'approved',   label: 'Approved',   color: '#4CAF50' },
  { value: 'issued',     label: 'Issued',     color: '#2196F3' },
  { value: 'active',     label: 'Active',     color: '#43A047' },
  { value: 'declined',   label: 'Declined',   color: '#E53935' },
  { value: 'lapsed',     label: 'Lapsed',     color: '#FF9800' },
  { value: 'cancelled',  label: 'Cancelled',  color: '#B71C1C' },
  { value: 'chargeback', label: 'Chargeback', color: '#9C27B0' },
] as const

export const HEALTH_STATUSES = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good',      label: 'Good' },
  { value: 'fair',      label: 'Fair' },
  { value: 'poor',      label: 'Poor' },
] as const

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'DC',
] as const

export const BRAND = {
  bg:       '#F5F2ED',
  gold:     '#C9A96E',
  goldDark: '#A8844A',
  text:     '#1A1A1A',
  textMid:  '#4A4A4A',
  textSoft: '#7A7A7A',
  border:   '#E5E1DA',
  white:    '#FFFFFF',
  red:      '#C0392B',
  green:    '#27AE60',
} as const
