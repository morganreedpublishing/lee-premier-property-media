const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const PACKAGES = {
  "Essential Package": 22500,
  "Essential Package + Aerial Coverage": 35000,
  "Luxury Media Bundle": 65000,
};

const ADDONS = {
  "Property over 2,500 sq ft": 10000,
  "Virtual staging": 4500,
  "Twilight photos": 12500,
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return response(405, { error: "Method not allowed" });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return response(500, { error: "Stripe is not configured." });
  }

  let payload;

  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return response(400, { error: "Invalid request body." });
  }

  const packageName = payload.packageName;
  const addonNames = Array.isArray(payload.addons) ? payload.addons : [];
  const customer = payload.customer || {};
  const baseUrl = event.headers.origin || process.env.URL || "https://www.leepremierpropertymedia.com";

  if (!PACKAGES[packageName]) {
    return response(400, { error: "Invalid package selected." });
  }

  const invalidAddon = addonNames.find((addon) => !ADDONS[addon]);

  if (invalidAddon) {
    return response(400, { error: `Invalid add-on selected: ${invalidAddon}` });
  }

  const lineItems = [
    {
      price_data: {
        currency: "usd",
        product_data: {
          name: packageName,
          description: "Lee Premier Property Media photoshoot package",
        },
        unit_amount: PACKAGES[packageName],
      },
      quantity: 1,
    },
    ...addonNames.map((addon) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: addon,
          description: "Lee Premier Property Media add-on service",
        },
        unit_amount: ADDONS[addon],
      },
      quantity: 1,
    })),
  ];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: customer.email || undefined,
      billing_address_collection: "auto",
      phone_number_collection: {
        enabled: true,
      },
      metadata: {
        package: packageName,
        addons: addonNames.join(", ") || "None",
        customer_name: customer.name || "",
        customer_phone: customer.phone || "",
        property_address: customer.address || "",
        preferred_date: customer.date || "",
        preferred_time: customer.time || "",
      },
      success_url: `${baseUrl}/?payment=success#booking`,
      cancel_url: `${baseUrl}/?payment=cancelled#booking`,
    });

    return response(200, { url: session.url });
  } catch (error) {
    return response(500, { error: error.message || "Unable to create checkout session." });
  }
};
