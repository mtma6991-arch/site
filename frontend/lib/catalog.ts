import type { ElementDef, PropDef } from "./types";

const align: PropDef = {
  key: "align",
  label: "تراز",
  type: "align",
  default: "start",
};

export const coreCatalog: ElementDef[] = [
  {
    type: "section",
    label: "بخش",
    category: "چیدمان",
    props: [
      { key: "background", label: "پس‌زمینه", type: "color", default: "#f3efe6" },
      { key: "padding", label: "فاصله عمودی", type: "select", default: "md", options: [
        { value: "sm", label: "کم" }, { value: "md", label: "معمول" }, { value: "lg", label: "زیاد" },
      ]},
      { key: "width", label: "عرض", type: "select", default: "default", options: [
        { value: "narrow", label: "باریک" }, { value: "default", label: "معمول" },
        { value: "wide", label: "پهن" }, { value: "full", label: "تمام" },
      ]},
    ],
  },
  {
    type: "columns",
    label: "ستون‌ها",
    category: "چیدمان",
    props: [
      { key: "gap", label: "فاصله", type: "select", default: "md", options: [
        { value: "sm", label: "کم" }, { value: "md", label: "معمول" }, { value: "lg", label: "زیاد" },
      ]},
    ],
  },
  { type: "column", label: "ستون", category: "چیدمان", hidden: true, props: [] },
  {
    type: "heading",
    label: "تیتر",
    category: "پایه",
    props: [
      { key: "text", label: "متن", type: "text", default: "تیتر تازه" },
      { key: "level", label: "سطح", type: "select", default: "2", options: [
        { value: "1", label: "H1" }, { value: "2", label: "H2" }, { value: "3", label: "H3" }, { value: "4", label: "H4" },
      ]},
      align,
      { key: "color", label: "رنگ", type: "color", default: "#1c1915" },
    ],
  },
  {
    type: "text",
    label: "متن",
    category: "پایه",
    props: [
      { key: "text", label: "متن", type: "textarea", default: "یک بند بنویسید." },
      { key: "size", label: "اندازه", type: "select", default: "md", options: [
        { value: "sm", label: "ریز" }, { value: "md", label: "معمول" }, { value: "lg", label: "درشت" },
      ]},
      align,
      { key: "muted", label: "کم‌رنگ", type: "switch", default: false },
    ],
  },
  {
    type: "richtext",
    label: "متن غنی",
    category: "پایه",
    props: [{ key: "html", label: "HTML", type: "textarea", default: "<p>متن با <strong>تأکید</strong>.</p>" }],
  },
  {
    type: "button",
    label: "دکمه",
    category: "پایه",
    props: [
      { key: "label", label: "برچسب", type: "text", default: "ادامه" },
      { key: "href", label: "پیوند", type: "url", default: "/" },
      { key: "variant", label: "حالت", type: "select", default: "primary", options: [
        { value: "primary", label: "اصلی" }, { value: "ghost", label: "خطی" }, { value: "dark", label: "تیره" },
      ]},
      align,
      { key: "newTab", label: "زبانه تازه", type: "switch", default: false },
    ],
  },
  {
    type: "image",
    label: "تصویر",
    category: "پایه",
    props: [
      { key: "url", label: "تصویر", type: "image", default: "" },
      { key: "alt", label: "متن جایگزین", type: "text", default: "" },
      { key: "caption", label: "زیرنویس", type: "text", default: "" },
      { key: "radius", label: "گردی", type: "select", default: "md", options: [
        { value: "none", label: "تیز" }, { value: "md", label: "ملایم" }, { value: "full", label: "دایره" },
      ]},
      align,
    ],
  },
  {
    type: "video",
    label: "ویدیو",
    category: "پایه",
    props: [
      { key: "url", label: "نشانی", type: "url", default: "" },
      { key: "title", label: "عنوان", type: "text", default: "ویدیو" },
    ],
  },
  {
    type: "spacer",
    label: "فاصله",
    category: "چیدمان",
    props: [{ key: "size", label: "اندازه", type: "select", default: "md", options: [
      { value: "sm", label: "کم" }, { value: "md", label: "معمول" }, { value: "lg", label: "زیاد" }, { value: "xl", label: "خیلی زیاد" },
    ]}],
  },
  {
    type: "divider",
    label: "جداکننده",
    category: "چیدمان",
    props: [{ key: "color", label: "رنگ", type: "color", default: "#ddd4c4" }],
  },
  {
    type: "list",
    label: "فهرست",
    category: "پایه",
    props: [
      { key: "items", label: "آیتم‌ها", type: "textarea", default: "مورد اول\nمورد دوم\nمورد سوم" },
      { key: "ordered", label: "شماره‌دار", type: "switch", default: false },
    ],
  },
  {
    type: "quote",
    label: "نقل‌قول",
    category: "پایه",
    props: [
      { key: "text", label: "متن", type: "textarea", default: "جمله‌ای که باید بماند." },
      { key: "cite", label: "گوینده", type: "text", default: "" },
    ],
  },
  {
    type: "hero",
    label: "قهرمان",
    category: "پیشرفته",
    props: [
      { key: "eyebrow", label: "بالانویس", type: "text", default: "نگار" },
      { key: "title", label: "تیتر", type: "text", default: "یک جمله بزرگ" },
      { key: "subtitle", label: "توضیح", type: "textarea", default: "زیر تیتر، کوتاه و روشن." },
      { key: "buttonLabel", label: "دکمه", type: "text", default: "شروع" },
      { key: "buttonHref", label: "پیوند دکمه", type: "url", default: "/" },
      { key: "secondaryLabel", label: "دکمه دوم", type: "text", default: "" },
      { key: "secondaryHref", label: "پیوند دوم", type: "url", default: "/" },
      { key: "tone", label: "لحن", type: "select", default: "ink", options: [
        { value: "ink", label: "تیره" }, { value: "paper", label: "روشن" }, { value: "teal", label: "سبزآبی" },
      ]},
      align,
    ],
  },
  {
    type: "cta",
    label: "فراخوان",
    category: "پیشرفته",
    props: [
      { key: "title", label: "تیتر", type: "text", default: "آماده شروع هستید؟" },
      { key: "text", label: "متن", type: "textarea", default: "یک جمله برای اقدام." },
      { key: "buttonLabel", label: "دکمه", type: "text", default: "ادامه" },
      { key: "buttonHref", label: "پیوند", type: "url", default: "/" },
      { key: "tone", label: "لحن", type: "select", default: "teal", options: [
        { value: "teal", label: "سبزآبی" }, { value: "ink", label: "تیره" }, { value: "paper", label: "روشن" },
      ]},
    ],
  },
  {
    type: "features",
    label: "ویژگی‌ها",
    category: "پیشرفته",
    props: [
      { key: "title", label: "تیتر", type: "text", default: "چرا این‌جا" },
      { key: "subtitle", label: "توضیح", type: "textarea", default: "" },
      { key: "items", label: "آیتم‌ها", type: "repeater", default: [
        { icon: "layout", title: "چیدمان", text: "بخش و ستون." },
        { icon: "pen", title: "نوشتن", text: "مقاله و تیتر." },
        { icon: "image", title: "رسانه", text: "تصویر در یک جا." },
      ], itemFields: [
        { key: "icon", label: "آیکن", type: "select", default: "layout", options: [
          { value: "layout", label: "چیدمان" }, { value: "pen", label: "قلم" },
          { value: "image", label: "تصویر" }, { value: "puzzle", label: "افزونه" },
          { value: "shield", label: "سپر" }, { value: "globe", label: "جهان" },
        ]},
        { key: "title", label: "عنوان", type: "text", default: "عنوان" },
        { key: "text", label: "متن", type: "textarea", default: "توضیح کوتاه" },
      ]},
    ],
  },
  {
    type: "stats",
    label: "آمار",
    category: "پیشرفته",
    props: [{
      key: "items", label: "آیتم‌ها", type: "repeater",
      default: [{ value: "۱۲", label: "صفحه" }, { value: "۴", label: "مقاله" }],
      itemFields: [
        { key: "value", label: "عدد", type: "text", default: "۰" },
        { key: "label", label: "برچسب", type: "text", default: "عنوان" },
      ],
    }],
  },
  {
    type: "cards",
    label: "کارت‌ها",
    category: "پیشرفته",
    props: [
      { key: "title", label: "تیتر", type: "text", default: "کارت‌ها" },
      { key: "items", label: "کارت‌ها", type: "repeater", default: [
        { title: "کارت", text: "توضیح", href: "/", imageUrl: "" },
      ], itemFields: [
        { key: "title", label: "عنوان", type: "text", default: "عنوان" },
        { key: "text", label: "متن", type: "textarea", default: "" },
        { key: "href", label: "پیوند", type: "url", default: "/" },
        { key: "imageUrl", label: "تصویر", type: "image", default: "" },
      ]},
    ],
  },
  {
    type: "testimonials",
    label: "نظرها",
    category: "پیشرفته",
    props: [
      { key: "title", label: "تیتر", type: "text", default: "گفته‌ها" },
      { key: "items", label: "نظرها", type: "repeater", default: [
        { quote: "جملهٔ نمونه.", name: "نام", role: "سمت" },
      ], itemFields: [
        { key: "quote", label: "نقل", type: "textarea", default: "" },
        { key: "name", label: "نام", type: "text", default: "" },
        { key: "role", label: "سمت", type: "text", default: "" },
      ]},
    ],
  },
  {
    type: "pricing",
    label: "قیمت",
    category: "پیشرفته",
    props: [
      { key: "title", label: "تیتر", type: "text", default: "طرح‌ها" },
      { key: "items", label: "طرح‌ها", type: "repeater", default: [
        { name: "پایه", price: "۰", period: "رایگان", features: "صفحه\nمقاله", buttonLabel: "شروع", buttonHref: "/", highlighted: false },
      ], itemFields: [
        { key: "name", label: "نام", type: "text", default: "طرح" },
        { key: "price", label: "قیمت", type: "text", default: "۰" },
        { key: "period", label: "دوره", type: "text", default: "ماهانه" },
        { key: "features", label: "ویژگی‌ها", type: "textarea", default: "یک مورد" },
        { key: "buttonLabel", label: "دکمه", type: "text", default: "انتخاب" },
        { key: "buttonHref", label: "پیوند", type: "url", default: "/" },
        { key: "highlighted", label: "برجسته", type: "switch", default: false },
      ]},
    ],
  },
  {
    type: "faq",
    label: "پرسش",
    category: "پیشرفته",
    props: [
      { key: "title", label: "تیتر", type: "text", default: "پرسش‌ها" },
      { key: "items", label: "پرسش‌ها", type: "repeater", default: [
        { q: "پرسش؟", a: "پاسخ." },
      ], itemFields: [
        { key: "q", label: "پرسش", type: "text", default: "" },
        { key: "a", label: "پاسخ", type: "textarea", default: "" },
      ]},
    ],
  },
  {
    type: "tabs",
    label: "زبانه‌ها",
    category: "پیشرفته",
    props: [{
      key: "items", label: "زبانه‌ها", type: "repeater",
      default: [{ label: "اول", html: "<p>متن زبانه.</p>" }, { label: "دوم", html: "<p>متن دیگر.</p>" }],
      itemFields: [
        { key: "label", label: "برچسب", type: "text", default: "زبانه" },
        { key: "html", label: "متن", type: "textarea", default: "" },
      ],
    }],
  },
  {
    type: "gallery",
    label: "گالری",
    category: "پیشرفته",
    props: [{
      key: "images", label: "تصاویر", type: "repeater", default: [],
      itemFields: [
        { key: "url", label: "تصویر", type: "image", default: "" },
        { key: "alt", label: "متن جایگزین", type: "text", default: "" },
      ],
    }],
  },
  {
    type: "logos",
    label: "لوگوها",
    category: "پیشرفته",
    props: [
      { key: "title", label: "تیتر", type: "text", default: "" },
      { key: "items", label: "لوگوها", type: "repeater", default: [], itemFields: [
        { key: "url", label: "تصویر", type: "image", default: "" },
        { key: "alt", label: "نام", type: "text", default: "" },
      ]},
    ],
  },
  {
    type: "form",
    label: "فرم",
    category: "پیشرفته",
    props: [
      { key: "title", label: "تیتر", type: "text", default: "تماس" },
      { key: "text", label: "توضیح", type: "textarea", default: "پیام‌تان را بنویسید." },
      { key: "formName", label: "شناسه فرم", type: "text", default: "contact" },
      { key: "submitLabel", label: "دکمه", type: "text", default: "ارسال" },
      { key: "successText", label: "پیام موفقیت", type: "text", default: "پیام رسید." },
      { key: "fields", label: "فیلدها", type: "repeater", default: [
        { name: "name", label: "نام", type: "text", required: true },
        { name: "email", label: "ایمیل", type: "email", required: true },
        { name: "message", label: "پیام", type: "textarea", required: true },
      ], itemFields: [
        { key: "name", label: "نام فیلد", type: "text", default: "field" },
        { key: "label", label: "برچسب", type: "text", default: "فیلد" },
        { key: "type", label: "نوع", type: "select", default: "text", options: [
          { value: "text", label: "متن" }, { value: "email", label: "ایمیل" }, { value: "textarea", label: "بلند" },
        ]},
        { key: "required", label: "الزامی", type: "switch", default: false },
      ]},
    ],
  },
  {
    type: "newsletter",
    label: "خبرنامه",
    category: "پیشرفته",
    props: [
      { key: "title", label: "تیتر", type: "text", default: "خبرنامه" },
      { key: "text", label: "متن", type: "textarea", default: "ایمیل‌تان را بگذارید." },
      { key: "formName", label: "شناسه", type: "text", default: "newsletter" },
    ],
  },
  {
    type: "map",
    label: "نقشه",
    category: "پیشرفته",
    props: [
      { key: "query", label: "نشانی یا مکان", type: "text", default: "Tehran" },
      { key: "zoom", label: "زوم", type: "number", default: 12 },
      { key: "height", label: "ارتفاع", type: "select", default: "md", options: [
        { value: "sm", label: "کوتاه" }, { value: "md", label: "معمول" }, { value: "lg", label: "بلند" },
      ]},
    ],
  },
  {
    type: "social",
    label: "شبکه‌ها",
    category: "پیشرفته",
    props: [{
      key: "items", label: "پیوندها", type: "repeater", default: [],
      itemFields: [
        { key: "network", label: "نام", type: "text", default: "سایت" },
        { key: "url", label: "نشانی", type: "url", default: "https://" },
      ],
    }],
  },
  {
    type: "alert",
    label: "هشدار",
    category: "پایه",
    props: [
      { key: "tone", label: "لحن", type: "select", default: "info", options: [
        { value: "info", label: "اطلاع" }, { value: "warn", label: "هشدار" },
        { value: "success", label: "موفق" }, { value: "danger", label: "خطر" },
      ]},
      { key: "title", label: "عنوان", type: "text", default: "توجه" },
      { key: "text", label: "متن", type: "textarea", default: "یک نکته کوتاه." },
    ],
  },
  {
    type: "table",
    label: "جدول",
    category: "پیشرفته",
    props: [
      { key: "headers", label: "سرستون‌ها", type: "text", default: "نام, مقدار" },
      { key: "rows", label: "سطرها", type: "textarea", default: "الف | ۱\nب | ۲" },
    ],
  },
  {
    type: "code",
    label: "کد",
    category: "پایه",
    props: [
      { key: "title", label: "عنوان", type: "text", default: "" },
      { key: "language", label: "زبان", type: "text", default: "text" },
      { key: "code", label: "کد", type: "textarea", default: "echo hello" },
    ],
  },
  {
    type: "embed",
    label: "جاسازی",
    category: "پیشرفته",
    props: [
      { key: "url", label: "نشانی", type: "url", default: "" },
      { key: "height", label: "ارتفاع", type: "number", default: 360 },
    ],
  },
  {
    type: "html",
    label: "HTML خام",
    category: "پیشرفته",
    props: [{ key: "html", label: "HTML", type: "textarea", default: "<p>HTML</p>" }],
  },
  {
    type: "shortcode",
    label: "شورت‌کد",
    category: "پیشرفته",
    props: [{ key: "slug", label: "شناسه اسنیپت", type: "text", default: "" }],
  },
  {
    type: "countdown",
    label: "شمارش معکوس",
    category: "پیشرفته",
    props: [
      { key: "title", label: "تیتر", type: "text", default: "تا شروع" },
      { key: "date", label: "تاریخ", type: "text", default: "" },
    ],
  },
  {
    type: "iconbox",
    label: "جعبه آیکن",
    category: "پایه",
    props: [
      { key: "icon", label: "آیکن", type: "select", default: "layout", options: [
        { value: "layout", label: "چیدمان" }, { value: "pen", label: "قلم" },
        { value: "image", label: "تصویر" }, { value: "puzzle", label: "افزونه" },
        { value: "shield", label: "سپر" }, { value: "globe", label: "جهان" },
      ]},
      { key: "title", label: "عنوان", type: "text", default: "عنوان" },
      { key: "text", label: "متن", type: "textarea", default: "توضیح." },
      align,
    ],
  },
];

export function mergeCatalog(extra: ElementDef[]): ElementDef[] {
  const seen = new Set(coreCatalog.map((c) => c.type));
  const plugin = extra.filter((e) => e.type && !seen.has(e.type));
  return [...coreCatalog, ...plugin];
}
