const SITE_SETTINGS = {
  email: "leepremierpropertymedia@gmail.com",
  phone: "",
  schedulerUrl: "",
  paymentLinks: {
    "Essential Photos": "https://buy.stripe.com/4gM3cw9AK4YE1Y9d6t1sQ04",
    "Premier Photo + Drone": "https://buy.stripe.com/4gMbJ2fZ8cr6gT3giF1sQ03",
    "Luxury Media Bundle": "https://buy.stripe.com/bJe4gA7sCcr61Y90jH1sQ02",
  },
};

const header = document.querySelector(".site-header");
const toggle = document.querySelector(".menu-toggle");
const bookingForm = document.querySelector("#booking-form");
const contactForm = document.querySelector(".contact-form");
const paymentLink = document.querySelector("#payment-link");
const schedulerLink = document.querySelector("#scheduler-link");
const calendarPanel = document.querySelector("#calendar-panel");
const calendlyEmbed = document.querySelector("#calendly-embed");
const summaryPackage = document.querySelector("#summary-package");
const summaryAddons = document.querySelector("#summary-addons");
const summaryTotal = document.querySelector("#summary-total");
const bookingDate = bookingForm?.querySelector('input[name="date"]');
const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
const phoneLinks = document.querySelectorAll('a[href^="tel:"]');

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function getBookingSelection() {
  const selectedPackage = bookingForm?.querySelector('input[name="package"]:checked');
  const selectedAddons = [...(bookingForm?.querySelectorAll('input[name="addons"]:checked') || [])];
  const packageName = selectedPackage?.value || "Essential Photos";
  const packagePrice = Number(selectedPackage?.dataset.price || 0);
  const addons = selectedAddons.map((addon) => ({
    name: addon.value,
    price: Number(addon.dataset.price || 0),
  }));
  const total = addons.reduce((sum, addon) => sum + addon.price, packagePrice);

  return { addons, packageName, total };
}

function updateSummary() {
  if (!bookingForm) return;

  const { addons, packageName, total } = getBookingSelection();
  summaryPackage.textContent = packageName;
  summaryAddons.textContent = addons.length ? addons.map((addon) => addon.name).join(", ") : "None selected";
  summaryTotal.textContent = money.format(total);

  const checkoutUrl = SITE_SETTINGS.paymentLinks[packageName] || "";
  paymentLink.dataset.paymentUrl = checkoutUrl;
  paymentLink.textContent = checkoutUrl ? `Pay ${money.format(total)} Securely` : "Pay Deposit";
}

function getCalendlyUrl() {
  const schedulerUrl = SITE_SETTINGS.schedulerUrl.trim();

  if (!schedulerUrl) return "";

  const url = new URL(schedulerUrl);
  url.searchParams.set("hide_gdpr_banner", "1");
  url.searchParams.set("primary_color", "b88632");
  url.searchParams.set("text_color", "061d38");
  return url.toString();
}

function loadCalendlyEmbed() {
  const calendlyUrl = getCalendlyUrl();

  if (!calendlyUrl || !calendarPanel || !calendlyEmbed) return;

  calendarPanel.classList.add("has-calendar");
  calendlyEmbed.dataset.url = calendlyUrl;

  if (window.Calendly?.initInlineWidget) {
    window.Calendly.initInlineWidget({
      url: calendlyUrl,
      parentElement: calendlyEmbed,
    });
    return;
  }

  window.setTimeout(loadCalendlyEmbed, 300);
}

function buildMailBody(formData, selection) {
  const addons = selection.addons.length
    ? selection.addons.map((addon) => `${addon.name} (${money.format(addon.price)})`).join(", ")
    : "None selected";

  return [
    `Name: ${formData.get("name") || ""}`,
    `Email: ${formData.get("email") || ""}`,
    `Phone: ${formData.get("phone") || ""}`,
    `Property address: ${formData.get("address") || ""}`,
    `Preferred date: ${formData.get("date") || ""}`,
    `Preferred time: ${formData.get("time") || ""}`,
    "",
    `Package: ${selection.packageName}`,
    `Add-ons: ${addons}`,
    `Estimated total: ${money.format(selection.total)}`,
    "",
    "Notes:",
    formData.get("notes") || formData.get("message") || "",
  ].join("\n");
}

toggle?.addEventListener("click", () => {
  const isOpen = header.classList.toggle("nav-open");
  toggle.setAttribute("aria-expanded", String(isOpen));
});

document.querySelectorAll(".site-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    header.classList.remove("nav-open");
    toggle?.setAttribute("aria-expanded", "false");
  });
});

emailLinks.forEach((link) => {
  link.href = `mailto:${SITE_SETTINGS.email}`;
  link.textContent = SITE_SETTINGS.email;
});

phoneLinks.forEach((link) => {
  if (!SITE_SETTINGS.phone) {
    link.remove();
    return;
  }

  link.href = `tel:${SITE_SETTINGS.phone.replace(/\D/g, "")}`;
  link.textContent = SITE_SETTINGS.phone;
});

if (bookingDate) {
  bookingDate.min = new Date().toISOString().split("T")[0];
}

if (schedulerLink) {
  schedulerLink.dataset.schedulerUrl = SITE_SETTINGS.schedulerUrl;
}

loadCalendlyEmbed();

bookingForm?.addEventListener("change", updateSummary);

bookingForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(bookingForm);
  const selection = getBookingSelection();
  const body = buildMailBody(formData, selection);
  window.location.href = `mailto:${SITE_SETTINGS.email}?subject=Photoshoot%20Scheduling%20Request&body=${encodeURIComponent(body)}`;
});

schedulerLink?.addEventListener("click", (event) => {
  const schedulerUrl = schedulerLink.dataset.schedulerUrl;

  if (!schedulerUrl) {
    event.preventDefault();
    alert("Online calendar is ready to connect. Add a Calendly, Acuity, Square Appointments, or HoneyBook URL in script.js.");
    return;
  }

  schedulerLink.href = schedulerUrl;
  schedulerLink.target = "_blank";
  schedulerLink.rel = "noopener";
});

paymentLink?.addEventListener("click", (event) => {
  const checkoutUrl = paymentLink.dataset.paymentUrl;

  if (!checkoutUrl) {
    event.preventDefault();
    alert("Payment is ready to connect. Add a Stripe, Square, or PayPal checkout URL in script.js to activate online payments.");
    return;
  }

  paymentLink.href = checkoutUrl;
  paymentLink.target = "_blank";
  paymentLink.rel = "noopener";
});

contactForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(contactForm);
  const body = [
    `Name: ${formData.get("name") || ""}`,
    `Email: ${formData.get("email") || ""}`,
    `Property address: ${formData.get("address") || ""}`,
    "",
    "Services needed:",
    formData.get("message") || "",
  ].join("\n");

  window.location.href = `mailto:${SITE_SETTINGS.email}?subject=New%20Listing%20Media%20Inquiry&body=${encodeURIComponent(body)}`;
});

updateSummary();
