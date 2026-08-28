import { prisma } from "../src/utils/prisma";

export async function seedProductCatalog() {
  console.log("Seeding Commercial Product Catalog...");

  // 1. Seed Permissions
  const catalogPermissions = [
    { code: "platform.catalog.view", name: "View Product Catalog", applicationCode: "PLATFORM" },
    { code: "platform.catalog.manage", name: "Manage Product Catalog", applicationCode: "PLATFORM" },
  ];

  for (const perm of catalogPermissions) {
    const p = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, applicationCode: perm.applicationCode },
      create: perm,
    });

    // Link to PLATFORM_ADMINISTRATOR role
    const adminRole = await prisma.role.findUnique({ where: { code: "PLATFORM_ADMINISTRATOR" } });
    if (adminRole) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: p.id,
        },
      });
    }
  }
  console.log("  ✓ Catalog permissions registered");

  // 2. Seed Modules
  const modulesData = [
    { code: "pos", name: "Point of Sale (POS)", description: "Cashier checkout, shift drawer, and payment workflows", isShared: true, sortOrder: 1 },
    { code: "product", name: "Product & Pricing", description: "Master catalog, SKU variants, modifiers, and price lists", isShared: true, sortOrder: 2 },
    { code: "inventory", name: "Inventory & WMS", description: "Stock ledger, warehouse topology, recipe BOM, and transfers", isShared: true, sortOrder: 3 },
    { code: "crm", name: "Customer & Loyalty", description: "Customer directory, loyalty reward points, and membership tiers", isShared: true, sortOrder: 4 },
    { code: "promotion", name: "Promotions & Discounts", description: "Discount rules, package bundles, vouchers, and promo logic", isShared: true, sortOrder: 5 },
    { code: "report", name: "Reporting & Analytics", description: "Operational daily, management profit, and executive telemetry", isShared: true, sortOrder: 6 },
    { code: "cinema", name: "Cinema Vertical", description: "Movie catalog, studio dynamic seat layout, schedules, box office", isShared: false, sortOrder: 7 },
    { code: "fnb", name: "F&B Vertical", description: "Table management, kitchen display system (KDS), and self-order kiosk", isShared: false, sortOrder: 8 },
    { code: "parking", name: "Parking Vertical", description: "Vehicle plate OCR detection, gate barrier control, and duration tariffs", isShared: false, sortOrder: 9 },
  ];

  for (const m of modulesData) {
    await prisma.module.upsert({
      where: { code: m.code },
      update: { name: m.name, description: m.description, isShared: m.isShared, sortOrder: m.sortOrder },
      create: m,
    });
  }
  console.log("  ✓ Canonical Modules seeded");

  // 3. Seed Canonical Features
  const featuresData = [
    // POS
    { key: "pos.checkout.cash", name: "Cash Checkout", moduleCode: "pos", isCore: true, description: "Cash payment and change calculation" },
    { key: "pos.checkout.qris", name: "QRIS Integrated Checkout", moduleCode: "pos", isCore: true, description: "Dynamic and static QRIS payment processing" },
    { key: "pos.checkout.card", name: "Card / EDC Payment", moduleCode: "pos", isCore: false, description: "Debit and credit card EDC settlement" },
    { key: "pos.checkout.ewallet", name: "E-Wallet Payment", moduleCode: "pos", isCore: false, description: "Digital wallet settlement (GoPay, OVO, ShopeePay, DANA)" },
    { key: "pos.bill.open_hold", name: "Open & Hold Bill", moduleCode: "pos", isCore: true, description: "Park and recall active order transactions" },
    { key: "pos.bill.split_bill", name: "Split Bill", moduleCode: "pos", isCore: false, description: "Divide a single order into multiple bills" },
    { key: "pos.bill.split_payment", name: "Split Payment", moduleCode: "pos", isCore: false, description: "Settle 1 bill using multiple payment methods" },
    { key: "pos.order.void", name: "Void Order", moduleCode: "pos", isCore: true, description: "Cancel unpaid orders with mandatory reason audit" },
    { key: "pos.order.refund", name: "Refund Transaction", moduleCode: "pos", isCore: false, description: "Refund paid transactions with supervisor PIN authorization" },
    { key: "pos.order.price_override", name: "Price Override", moduleCode: "pos", isCore: false, description: "Authorized cashier manual price adjustment" },
    { key: "pos.shift.open_close", name: "Shift Open & Close", moduleCode: "pos", isCore: true, description: "Cashier cash drawer opening balance and daily closing" },
    { key: "pos.shift.variance", name: "Shift Cash Variance Audit", moduleCode: "pos", isCore: false, description: "Automated discrepancy audit between physical cash and expected cash" },
    { key: "pos.petty_cash", name: "Petty Cash Management", moduleCode: "pos", isCore: false, description: "Record operational in/out cash expenses at register" },
    { key: "pos.receipt.print", name: "ESC/POS Receipt Printing", moduleCode: "pos", isCore: true, description: "Direct thermal receipt printing over USB, BLE, and LAN" },
    { key: "pos.receipt.digital", name: "Digital Receipt (WhatsApp/Email)", moduleCode: "pos", isCore: false, description: "Paperless digital receipt delivery via WhatsApp or email" },
    { key: "pos.hardware.customer_display", name: "Customer Facing Display", moduleCode: "pos", isCore: false, description: "Interactive secondary screen displaying order summary to customer" },
    { key: "pos.offline.queue", name: "Offline Transaction Queue", moduleCode: "pos", isCore: false, description: "Local IndexedDB/SQLite transaction queue during network outage" },
    { key: "pos.offline.sync", name: "Resilient Cloud Auto-Sync", moduleCode: "pos", isCore: false, description: "Automatic background synchronization when network reconnects" },

    // PRODUCT
    { key: "product.catalog.manage", name: "Master Product Catalog", moduleCode: "product", isCore: true, description: "Manage products, barcodes, SKUs, categories, and brands" },
    { key: "product.variant.matrix", name: "Product Variants Matrix", moduleCode: "product", isCore: false, description: "Multi-dimensional variant matrix (Size, Flavor, Color)" },
    { key: "product.modifier.addon", name: "Product Modifiers & Add-ons", moduleCode: "product", isCore: false, description: "Extra options (Sugar Level, Toppings, Extra Shot)" },
    { key: "product.pricing.outlet", name: "Outlet Price Lists", moduleCode: "product", isCore: false, description: "Custom pricing rules per outlet or physical branch" },
    { key: "product.pricing.tier", name: "Membership Tier Pricing", moduleCode: "product", isCore: false, description: "Exclusive pricing per customer membership level (Silver/Gold/VIP)" },
    { key: "product.pricing.scheduled", name: "Scheduled Happy Hour Pricing", moduleCode: "product", isCore: false, description: "Time-based scheduled promotional pricing" },

    // INVENTORY
    { key: "inventory.stock.basic", name: "Basic Single Stock", moduleCode: "inventory", isCore: true, description: "Single-store inventory tracking at cash register" },
    { key: "inventory.stock.ledger", name: "Double-Entry Stock Ledger", moduleCode: "inventory", isCore: false, description: "Immutable audit ledger tracking debit/credit stock mutations" },
    { key: "inventory.multi_warehouse", name: "Multi-Warehouse Topology", moduleCode: "inventory", isCore: false, description: "Multiple warehouse units per outlet (Main, Kitchen, Bar, Storage)" },
    { key: "inventory.transfer.flow", name: "Inter-Warehouse Transfer Flow", moduleCode: "inventory", isCore: false, description: "Stock transfer workflow: Request -> Approve -> Dispatch -> Receive" },
    { key: "inventory.recipe.bom", name: "Recipe / Bill of Materials (BOM)", moduleCode: "inventory", isCore: false, description: "Raw material recipe auto-deduction upon finished goods sale" },
    { key: "inventory.uom.conversion", name: "Multi-Tier UOM Conversion", moduleCode: "inventory", isCore: false, description: "Multi-level unit conversions (Box -> Pack -> Pieces -> Grams)" },
    { key: "inventory.adjustment", name: "Stock Opname & Adjustment", moduleCode: "inventory", isCore: false, description: "Physical stock reconciliation and variance adjustment" },
    { key: "inventory.waste.track", name: "Waste & Spoilage Tracking", moduleCode: "inventory", isCore: false, description: "Track damaged or expired goods with cost loss reporting" },
    { key: "inventory.purchasing.po", name: "Purchase Order & Supplier Receiving", moduleCode: "inventory", isCore: false, description: "Vendor purchase orders and receiving verification" },

    // CRM & PROMOTIONS
    { key: "crm.customer.directory", name: "Customer Directory", moduleCode: "crm", isCore: true, description: "Customer profile database and lifetime transaction history" },
    { key: "crm.loyalty.points", name: "Loyalty Points & Rewards", moduleCode: "crm", isCore: false, description: "Reward point accumulation and redemption catalog" },
    { key: "crm.membership.tier", name: "Customer Membership Tiers", moduleCode: "crm", isCore: false, description: "Multi-tier membership status (Bronze, Silver, Gold, Platinum)" },
    { key: "promotion.discount.manual", name: "Cashier Direct Discount", moduleCode: "promotion", isCore: true, description: "Manual item and transaction percentage/nominal discounts" },
    { key: "promotion.bundle.package", name: "Package Combo Bundles", moduleCode: "promotion", isCore: false, description: "Fixed and choice combo meal product bundles" },
    { key: "promotion.buy_x_get_y", name: "Buy X Get Y Automation", moduleCode: "promotion", isCore: false, description: "Automated promotional rules for buy X get Y free" },
    { key: "promotion.voucher.code", name: "Voucher Codes & Coupons", moduleCode: "promotion", isCore: false, description: "Promotional coupon codes with usage quotas and date validity" },

    // REPORTING
    { key: "report.operational.daily", name: "Daily Operational Sales Report", moduleCode: "report", isCore: true, description: "Cashier closing and daily revenue breakdown" },
    { key: "report.management.profit", name: "Profitability & Recipe COGS Report", moduleCode: "report", isCore: false, description: "Gross margin and recipe cost-of-goods-sold analysis" },
    { key: "report.management.movement", name: "Inventory Mutation & Transfer Report", moduleCode: "report", isCore: false, description: "Stock turnover, supplier receiving, and waste analysis" },
    { key: "report.executive.stream", name: "Executive Real-time Telemetry", moduleCode: "report", isCore: false, description: "Multi-outlet real-time executive dashboard streaming" },
    { key: "report.executive.alert", name: "Executive Anomaly Alerts", moduleCode: "report", isCore: false, description: "Automated anomaly detection for cash variance and void spikes" },
    { key: "report.export.raw_data", name: "Raw Data Export (CSV/Excel)", moduleCode: "report", isCore: true, description: "Export raw transaction and inventory data to Excel and CSV" },

    // CINEMA VERTICAL
    { key: "cinema.movie.manage", name: "Movie Catalog Management", moduleCode: "cinema", isCore: false, description: "Master movie titles, synopsis, poster media, censorship rating" },
    { key: "cinema.studio.layout", name: "Studio Dynamic Seat Layout", moduleCode: "cinema", isCore: false, description: "Geometric seat grid editor, aisle markers, and VIP/Regular seat types" },
    { key: "cinema.schedule.manage", name: "Showtime Scheduler", moduleCode: "cinema", isCore: false, description: "Schedule movie showtimes per studio and business date" },
    { key: "cinema.ticket.box_office", name: "Box Office Ticket Counter", moduleCode: "cinema", isCore: false, description: "Ticket sales POS with real-time dynamic seat locking" },
    { key: "cinema.ticket.gate_scan", name: "Gate QR Ticket Scanner", moduleCode: "cinema", isCore: false, description: "Studio entrance QR barcode validation and anti-passback" },
    { key: "cinema.closing.daily", name: "Box Office Daily Closing", moduleCode: "cinema", isCore: false, description: "Cinema box office closing and distributor revenue share report" },

    // F&B VERTICAL
    { key: "fnb.table.manage", name: "Table & Dine-in Layout", moduleCode: "fnb", isCore: false, description: "Dine-in floor plan editor and real-time table occupancy status" },
    { key: "fnb.kds.kitchen_display", name: "Kitchen Display System (KDS)", moduleCode: "fnb", isCore: false, description: "Digital kitchen preparation screen with timer and item completion" },
    { key: "fnb.self_order.kiosk", name: "Self-Order Kiosk & QR Dine-in", moduleCode: "fnb", isCore: false, description: "Customer self-ordering interface via QR code or freestanding kiosk" },
    { key: "fnb.recipe.costing", name: "F&B Menu Recipe Costing", moduleCode: "fnb", isCore: false, description: "Portion cost breakdown and automated recipe margin calculator" },

    // PARKING VERTICAL
    { key: "parking.ocr.scan", name: "Vehicle License Plate OCR", moduleCode: "parking", isCore: false, description: "Automated license plate recognition from entry gate camera" },
    { key: "parking.ticket.gate", name: "Parking Ticket & Barrier Gate", moduleCode: "parking", isCore: false, description: "Barcode ticket issuance and automated barrier gate controller" },
    { key: "parking.tariff.duration", name: "Progressive Duration Tariff", moduleCode: "parking", isCore: false, description: "Hourly and vehicle-type progressive parking tariff engine" },
  ];

  for (const f of featuresData) {
    await prisma.feature.upsert({
      where: { key: f.key },
      update: { name: f.name, moduleCode: f.moduleCode, isCore: f.isCore, description: f.description },
      create: f,
    });
  }
  console.log("  ✓ Canonical Features seeded");

  // 4. Seed Feature Dependencies
  const dependenciesData = [
    { featureKey: "pos.bill.split_bill", dependsOnKey: "pos.bill.open_hold", dependencyType: "REQUIRED" },
    { featureKey: "inventory.transfer.flow", dependsOnKey: "inventory.multi_warehouse", dependencyType: "REQUIRED" },
    { featureKey: "fnb.kds.kitchen_display", dependsOnKey: "pos.order.void", dependencyType: "REQUIRED" },
    { featureKey: "fnb.self_order.kiosk", dependsOnKey: "pos.checkout.qris", dependencyType: "REQUIRED" },
    { featureKey: "fnb.recipe.costing", dependsOnKey: "inventory.recipe.bom", dependencyType: "REQUIRED" },
    { featureKey: "cinema.ticket.box_office", dependsOnKey: "cinema.schedule.manage", dependencyType: "REQUIRED" },
    { featureKey: "cinema.ticket.gate_scan", dependsOnKey: "cinema.ticket.box_office", dependencyType: "REQUIRED" },
    { featureKey: "parking.tariff.duration", dependsOnKey: "parking.ticket.gate", dependencyType: "REQUIRED" },
  ];

  for (const dep of dependenciesData) {
    await prisma.featureDependency.upsert({
      where: {
        featureKey_dependsOnKey: {
          featureKey: dep.featureKey,
          dependsOnKey: dep.dependsOnKey,
        },
      },
      update: { dependencyType: dep.dependencyType },
      create: dep,
    });
  }
  console.log("  ✓ Feature Dependencies seeded");

  // 5. Seed 5 Canonical Plans
  const plansData = [
    {
      code: "PLAN_FREE",
      name: "Free / Demo Plan",
      tier: "FREE",
      description: "For micro-merchants and trial evaluation with basic cashier and single-outlet operations",
      sortOrder: 1,
      featureKeys: [
        "pos.checkout.cash",
        "pos.checkout.qris",
        "pos.bill.open_hold",
        "pos.order.void",
        "pos.shift.open_close",
        "pos.receipt.print",
        "product.catalog.manage",
        "inventory.stock.basic",
        "crm.customer.directory",
        "promotion.discount.manual",
        "report.operational.daily",
        "report.export.raw_data",
      ],
    },
    {
      code: "PLAN_STARTER",
      name: "Starter Plan",
      tier: "STARTER",
      description: "Essential POS capabilities for single-store retail and food stalls",
      sortOrder: 2,
      featureKeys: [
        "pos.checkout.cash",
        "pos.checkout.qris",
        "pos.checkout.card",
        "pos.checkout.ewallet",
        "pos.bill.open_hold",
        "pos.order.void",
        "pos.shift.open_close",
        "pos.shift.variance",
        "pos.petty_cash",
        "pos.receipt.print",
        "product.catalog.manage",
        "product.modifier.addon",
        "inventory.stock.basic",
        "crm.customer.directory",
        "promotion.discount.manual",
        "promotion.voucher.code",
        "report.operational.daily",
        "report.export.raw_data",
      ],
    },
    {
      code: "PLAN_PRO",
      name: "Pro Plan",
      tier: "PRO",
      description: "Complete operational suite with multi-warehouse, recipe BOM, and management analytics",
      sortOrder: 3,
      featureKeys: [
        "pos.checkout.cash",
        "pos.checkout.qris",
        "pos.checkout.card",
        "pos.checkout.ewallet",
        "pos.bill.open_hold",
        "pos.bill.split_bill",
        "pos.bill.split_payment",
        "pos.order.void",
        "pos.order.refund",
        "pos.order.price_override",
        "pos.shift.open_close",
        "pos.shift.variance",
        "pos.petty_cash",
        "pos.receipt.print",
        "pos.receipt.digital",
        "pos.hardware.customer_display",
        "pos.offline.queue",
        "pos.offline.sync",
        "product.catalog.manage",
        "product.variant.matrix",
        "product.modifier.addon",
        "product.pricing.outlet",
        "inventory.stock.basic",
        "inventory.stock.ledger",
        "inventory.multi_warehouse",
        "inventory.transfer.flow",
        "inventory.recipe.bom",
        "inventory.adjustment",
        "inventory.waste.track",
        "crm.customer.directory",
        "crm.loyalty.points",
        "crm.membership.tier",
        "promotion.discount.manual",
        "promotion.bundle.package",
        "promotion.buy_x_get_y",
        "promotion.voucher.code",
        "report.operational.daily",
        "report.management.profit",
        "report.management.movement",
        "report.export.raw_data",
      ],
    },
    {
      code: "PLAN_BUSINESS",
      name: "Business Plan",
      tier: "BUSINESS",
      description: "Advanced multi-outlet chain management with executive streaming and purchasing",
      sortOrder: 4,
      featureKeys: [
        "pos.checkout.cash",
        "pos.checkout.qris",
        "pos.checkout.card",
        "pos.checkout.ewallet",
        "pos.bill.open_hold",
        "pos.bill.split_bill",
        "pos.bill.split_payment",
        "pos.order.void",
        "pos.order.refund",
        "pos.order.price_override",
        "pos.shift.open_close",
        "pos.shift.variance",
        "pos.petty_cash",
        "pos.receipt.print",
        "pos.receipt.digital",
        "pos.hardware.customer_display",
        "pos.offline.queue",
        "pos.offline.sync",
        "product.catalog.manage",
        "product.variant.matrix",
        "product.modifier.addon",
        "product.pricing.outlet",
        "product.pricing.tier",
        "product.pricing.scheduled",
        "inventory.stock.basic",
        "inventory.stock.ledger",
        "inventory.multi_warehouse",
        "inventory.transfer.flow",
        "inventory.recipe.bom",
        "inventory.uom.conversion",
        "inventory.adjustment",
        "inventory.waste.track",
        "inventory.purchasing.po",
        "crm.customer.directory",
        "crm.loyalty.points",
        "crm.membership.tier",
        "promotion.discount.manual",
        "promotion.bundle.package",
        "promotion.buy_x_get_y",
        "promotion.voucher.code",
        "report.operational.daily",
        "report.management.profit",
        "report.management.movement",
        "report.executive.stream",
        "report.executive.alert",
        "report.export.raw_data",
      ],
    },
    {
      code: "PLAN_ENTERPRISE",
      name: "Enterprise Plan",
      tier: "ENTERPRISE",
      description: "Custom enterprise multi-brand contracts, dedicated infrastructure, and unlimited catalog capabilities",
      sortOrder: 5,
      featureKeys: [
        "pos.checkout.cash",
        "pos.checkout.qris",
        "pos.checkout.card",
        "pos.checkout.ewallet",
        "pos.bill.open_hold",
        "pos.bill.split_bill",
        "pos.bill.split_payment",
        "pos.order.void",
        "pos.order.refund",
        "pos.order.price_override",
        "pos.shift.open_close",
        "pos.shift.variance",
        "pos.petty_cash",
        "pos.receipt.print",
        "pos.receipt.digital",
        "pos.hardware.customer_display",
        "pos.offline.queue",
        "pos.offline.sync",
        "product.catalog.manage",
        "product.variant.matrix",
        "product.modifier.addon",
        "product.pricing.outlet",
        "product.pricing.tier",
        "product.pricing.scheduled",
        "inventory.stock.basic",
        "inventory.stock.ledger",
        "inventory.multi_warehouse",
        "inventory.transfer.flow",
        "inventory.recipe.bom",
        "inventory.uom.conversion",
        "inventory.adjustment",
        "inventory.waste.track",
        "inventory.purchasing.po",
        "crm.customer.directory",
        "crm.loyalty.points",
        "crm.membership.tier",
        "promotion.discount.manual",
        "promotion.bundle.package",
        "promotion.buy_x_get_y",
        "promotion.voucher.code",
        "report.operational.daily",
        "report.management.profit",
        "report.management.movement",
        "report.executive.stream",
        "report.executive.alert",
        "report.export.raw_data",
      ],
    },
  ];

  for (const p of plansData) {
    const { featureKeys, ...planFields } = p;
    await prisma.plan.upsert({
      where: { code: planFields.code },
      update: { name: planFields.name, tier: planFields.tier, description: planFields.description, sortOrder: planFields.sortOrder },
      create: planFields,
    });

    await prisma.planFeature.deleteMany({ where: { planCode: planFields.code } });
    for (const fk of featureKeys) {
      await prisma.planFeature.create({
        data: {
          planCode: planFields.code,
          featureKey: fk,
        },
      });
    }
  }
  console.log("  ✓ 5 Canonical Plans seeded with features");

  // 6. Seed Add-ons
  const addOnsData = [
    {
      code: "ADDON_KDS",
      name: "Kitchen Display System (KDS)",
      description: "Digital kitchen preparation screen and chef dispatching",
      featureKeys: ["fnb.kds.kitchen_display"],
    },
    {
      code: "ADDON_SELF_ORDER",
      name: "Self-Order Kiosk & QR Ordering",
      description: "Customer self-checkout kiosk and table scan QR",
      featureKeys: ["fnb.self_order.kiosk"],
    },
    {
      code: "ADDON_LOYALTY",
      name: "Loyalty Points & Rewards Club",
      description: "Customer points accumulation, tiers, and rewards",
      featureKeys: ["crm.loyalty.points", "crm.membership.tier"],
    },
    {
      code: "ADDON_ADV_WMS",
      name: "Advanced WMS & Inter-WH Transfer",
      description: "Multi-warehouse topology, dispatch workflows, and UOM conversions",
      featureKeys: ["inventory.multi_warehouse", "inventory.transfer.flow", "inventory.uom.conversion"],
    },
    {
      code: "ADDON_OPEN_API",
      name: "Open API & Integration Webhooks",
      description: "External API access and event webhook triggers",
      featureKeys: ["report.export.raw_data"],
    },
    {
      code: "ADDON_WHATSAPP",
      name: "WhatsApp Digital Receipts & Notifications",
      description: "Automated WhatsApp delivery for e-receipts and order status",
      featureKeys: ["pos.receipt.digital"],
    },
  ];

  for (const a of addOnsData) {
    const { featureKeys, ...addonFields } = a;
    await prisma.addOn.upsert({
      where: { code: addonFields.code },
      update: { name: addonFields.name, description: addonFields.description },
      create: addonFields,
    });

    await prisma.addOnFeature.deleteMany({ where: { addOnCode: addonFields.code } });
    for (const fk of featureKeys) {
      await prisma.addOnFeature.create({
        data: {
          addOnCode: addonFields.code,
          featureKey: fk,
        },
      });
    }
  }
  console.log("  ✓ Add-ons seeded with features");

  // 7. Seed Verticals
  const verticalsData = [
    {
      code: "VERTICAL_CINEMA",
      name: "Cinema Multiplex & Box Office",
      description: "Complete cinema ticketing, dynamic seat layout, and showtime schedules",
      featureKeys: [
        "cinema.movie.manage",
        "cinema.studio.layout",
        "cinema.schedule.manage",
        "cinema.ticket.box_office",
        "cinema.ticket.gate_scan",
        "cinema.closing.daily",
      ],
    },
    {
      code: "VERTICAL_FNB",
      name: "Food & Beverage (F&B) Suite",
      description: "Restaurant tables, kitchen displays, self-orders, and recipe costing",
      featureKeys: [
        "fnb.table.manage",
        "fnb.kds.kitchen_display",
        "fnb.self_order.kiosk",
        "fnb.recipe.costing",
      ],
    },
    {
      code: "VERTICAL_PARKING",
      name: "Smart Parking & Mobility",
      description: "Plate OCR recognition, barrier gate tickets, and progressive tariffs",
      featureKeys: [
        "parking.ocr.scan",
        "parking.ticket.gate",
        "parking.tariff.duration",
      ],
    },
    {
      code: "VERTICAL_RETAIL",
      name: "Retail Matrix & Consignment",
      description: "Multi-variant matrix, modifiers, and multi-tier pricing",
      featureKeys: [
        "product.variant.matrix",
        "product.modifier.addon",
        "product.pricing.tier",
        "inventory.uom.conversion",
      ],
    },
    {
      code: "VERTICAL_BILLIARD",
      name: "Billiard & Sports Arena Timing",
      description: "Table session tracking, duration billing, and closing reports",
      featureKeys: ["pos.bill.open_hold", "pos.shift.open_close"],
    },
  ];

  for (const v of verticalsData) {
    const { featureKeys, ...vertFields } = v;
    await prisma.vertical.upsert({
      where: { code: vertFields.code },
      update: { name: vertFields.name, description: vertFields.description },
      create: vertFields,
    });

    await prisma.verticalFeature.deleteMany({ where: { verticalCode: vertFields.code } });
    for (const fk of featureKeys) {
      await prisma.verticalFeature.create({
        data: {
          verticalCode: vertFields.code,
          featureKey: fk,
        },
      });
    }
  }
  console.log("  ✓ Verticals seeded with features");

  console.log("✓ Commercial Product Catalog Seeding Complete.");
}
