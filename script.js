const SITE_SETTINGS = {
  email: "leepremierpropertymedia@gmail.com",
  phone: "",
  schedulerUrl: "",
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
const paymentStatus = document.querySelector("#payment-status");
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
  const packageName = selectedPackage?.value || "Essential Package";
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
  paymentLink.textContent = `Pay ${money.format(total)} Securely`;
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

const paymentResult = new URLSearchParams(window.location.search).get("payment");

if (paymentStatus && paymentResult === "success") {
  paymentStatus.hidden = false;
  paymentStatus.textContent = "Payment received. Your photoshoot details are ready for confirmation.";
}

if (paymentStatus && paymentResult === "cancelled") {
  paymentStatus.hidden = false;
  paymentStatus.classList.add("cancelled");
  paymentStatus.textContent = "Payment was not completed. You can adjust your package and try again.";
}

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

paymentLink?.addEventListener("click", async (event) => {
  event.preventDefault();

  if (!bookingForm?.reportValidity()) {
    return;
  }

  const formData = new FormData(bookingForm);
  const selection = getBookingSelection();
  paymentLink.textContent = "Opening Secure Checkout...";
  paymentLink.setAttribute("aria-busy", "true");

  try {
    const checkoutResponse = await fetch("/.netlify/functions/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        packageName: selection.packageName,
        addons: selection.addons.map((addon) => addon.name),
        customer: {
          name: formData.get("name") || "",
          email: formData.get("email") || "",
          phone: formData.get("phone") || "",
          address: formData.get("address") || "",
          date: formData.get("date") || "",
          time: formData.get("time") || "",
        },
      }),
    });
    const checkout = await checkoutResponse.json();

    if (!checkoutResponse.ok || !checkout.url) {
      throw new Error(checkout.error || "Unable to start checkout.");
    }

    window.location.href = checkout.url;
  } catch (error) {
    alert(error.message || "Unable to start checkout. Please try again.");
  } finally {
    paymentLink.removeAttribute("aria-busy");
    updateSummary();
  }
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
