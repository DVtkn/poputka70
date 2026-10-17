import { z } from "zod";

const idString = z.string().trim().min(1, "Не указан идентификатор").max(64);
const timeHHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Время в формате ЧЧ:ММ");
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Дата в формате ГГГГ-ММ-ДД");
const daysOfWeek = z
  .array(z.number().int().min(1).max(7))
  .min(1, "Выбери хотя бы один день")
  .max(7)
  .refine((days) => new Set(days).size === days.length, "Дни не должны повторяться");

export const loginSchema = z.object({
  login: z.string().trim().min(3, "Логин минимум 3 символа").max(64, "Логин слишком длинный"),
  password: z.string().min(6, "Пароль минимум 6 символов").max(72, "Пароль слишком длинный"),
});

export const registerSchema = z.object({
  login: z
    .string()
    .trim()
    .min(3, "Логин минимум 3 символа")
    .max(64, "Логин слишком длинный")
    .regex(/^[a-zA-Z0-9._@-]+$/, "Логин: латиница, цифры и символы . _ - @"),
  password: z.string().min(6, "Пароль минимум 6 символов").max(72, "Пароль слишком длинный"),
  firstName: z.string().trim().min(1, "Укажи имя").max(60, "Слишком длинное имя"),
  lastName: z.string().trim().max(60, "Слишком длинная фамилия").optional().default(""),
  referralCode: z.string().trim().max(16).optional().default(""),
});

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1, "Укажи имя").max(60, "Слишком длинное имя"),
  lastName: z.string().trim().max(60, "Слишком длинная фамилия").optional().default(""),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .default("")
    .refine((value) => value === "" || /^\+?[0-9()\-\s]{10,20}$/.test(value), "Телефон в формате +7 999 123-45-67"),
  bio: z.string().trim().max(500, "О себе — до 500 символов").optional().default(""),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(6, "Текущий пароль — минимум 6 символов").max(72),
  newPassword: z.string().min(6, "Новый пароль — минимум 6 символов").max(72),
});

export const driverRegisterSchema = z.object({
  carModel: z.string().trim().min(1, "Укажи модель авто").max(60),
  carNumber: z.string().trim().min(2, "Укажи номер авто").max(16),
  carColor: z.string().trim().max(40).optional().default(""),
});

export const routeCreateSchema = z.object({
  originId: idString,
  destId: idString,
  departureTime: timeHHMM,
  daysOfWeek,
  seats: z.number().int().min(1, "Мест: от 1").max(8, "Мест: до 8"),
  price: z.number().int().min(1, "Цена: минимум 1 ₽").max(50000, "Цена: максимум 50 000 ₽"),
});

export const bookingCreateSchema = z.object({ tripId: idString });

export const reviewCreateSchema = z.object({
  bookingId: idString,
  rating: z.number().int().min(1, "Оценка от 1").max(5, "Оценка до 5"),
  comment: z.string().trim().max(500, "Комментарий до 500 символов").optional().default(""),
});

export const demandRequestSchema = z.object({
  fromStopId: idString,
  toStopId: idString,
  date: dateOnly,
  timeWindow: timeHHMM.optional().or(z.literal("")),
  seats: z.number().int().min(1, "Мест: от 1").max(4, "Мест: до 4").default(1),
});

export const notificationsPatchSchema = z.object({
  notificationIds: z.array(idString).min(1, "Не указаны уведомления").max(50, "Слишком много за раз"),
  read: z.boolean().optional(),
});

export const notificationsQuerySchema = z.object({
  unread: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().trim().min(10).max(2048),
  keys: z.object({
    p256dh: z.string().min(10).max(500),
    auth: z.string().min(5).max(200),
  }),
});

export const adminVerificationSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  comment: z.string().trim().max(500).optional().default(""),
});

export const paymentCreateSchema = z.object({ bookingId: idString });

export const routesQuerySchema = z.object({
  from: z.string().trim().max(80).optional(),
  to: z.string().trim().max(80).optional(),
  date: dateOnly.optional(),
  passengers: z.coerce.number().int().min(1).max(8).default(1),
});

export const cityPointsQuerySchema = z.object({
  type: z.enum(["ORIGIN", "DESTINATION", "BOTH"]).optional(),
  category: z.enum(["RESIDENTIAL", "CENTER", "UNIVERSITY", "BUSINESS", "TRANSPORT"]).optional(),
});

export const stopsQuerySchema = z.object({
  query: z.string().trim().max(80).optional().default(""),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export const pricingSuggestQuerySchema = z.object({ originId: idString, destId: idString });

export const referralApplySchema = z.object({
  referralCode: z.string().trim().min(4, "Код слишком короткий").max(16),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type DriverRegisterInput = z.infer<typeof driverRegisterSchema>;
export type RouteCreateInput = z.infer<typeof routeCreateSchema>;
export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;
export type DemandRequestInput = z.infer<typeof demandRequestSchema>;

const stopRefSchema = z
  .object({
    name: z.string().trim().min(2, "Выбери точку из подсказок").max(120),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .strict();

export const publishTripSchema = z.object({
  origin: stopRefSchema,
  dest: stopRefSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Дата в формате ГГГГ-ММ-ДД"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Время в формате ЧЧ:ММ"),
  seats: z.number().int().min(1, "Мест: от 1").max(4, "Мест: до 4"),
  price: z.number().int().min(0, "Цена не может быть отрицательной").max(50000, "Слишком большая цена"),
  comment: z.string().trim().max(300, "Заметка до 300 символов").optional().default(""),
  repeat: z.enum(["none", "weekdays", "weekends", "daily"]).default("none"),
  autoAccept: z.boolean().default(true),
});

export const tripSearchQuerySchema = z.object({
  from: z.string().trim().max(120).optional().default(""),
  to: z.string().trim().max(120).optional().default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  passengers: z.coerce.number().int().min(1).max(6).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

export const bookingRequestSchema = z.object({
  tripId: idString,
  pickupStopId: idString.optional().nullable(),
  dropoffStopId: idString.optional().nullable(),
  note: z.string().trim().max(200).optional().default(""),
});

export const tripQuoteSchema = z.object({
  pickupStopId: idString.optional().nullable(),
  dropoffStopId: idString.optional().nullable(),
});

export type PublishTripInput = z.infer<typeof publishTripSchema>;
export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;
