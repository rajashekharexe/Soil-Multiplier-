import os
import re

files = [
    "faq.html", "returns.html", "shipping.html", "terms.html", "privacy.html",
    "product-info.html", "login.html", "register.html", "forgot-password.html"
]

policy_pages = {"faq.html", "returns.html", "shipping.html", "terms.html", "privacy.html", "product-info.html"}

footer_html = """<footer style="background: #0a0a0a; border-top: 1px solid rgba(255,255,255,0.08); padding: 2rem 1.5rem; text-align: center;">
  <p style="color: #666; font-size: 0.85rem; margin: 0;">&copy; 2026 KAD Multiplier. All rights reserved.</p>
  <div style="margin-top: 0.8rem; display: flex; gap: 1.5rem; justify-content: center; flex-wrap: wrap;">
    <a href="/privacy.html" style="color: #888; text-decoration: none; font-size: 0.8rem; transition: color 0.3s;">Privacy Policy</a>
    <a href="/terms.html" style="color: #888; text-decoration: none; font-size: 0.8rem; transition: color 0.3s;">Terms of Service</a>
    <a href="/faq.html" style="color: #888; text-decoration: none; font-size: 0.8rem; transition: color 0.3s;">FAQ</a>
    <a href="/shipping.html" style="color: #888; text-decoration: none; font-size: 0.8rem; transition: color 0.3s;">Shipping</a>
    <a href="/returns.html" style="color: #888; text-decoration: none; font-size: 0.8rem; transition: color 0.3s;">Returns</a>
  </div>
</footer>"""

seo_data = {
    "faq.html": {
        "title": "<title>FAQ | KAD Multiplier</title>",
        "meta": """<meta name="description" content="Frequently asked questions about KAD Multiplier - Advanced Bio-Stimulant for healthier soil and higher crop yields.">\n<meta property="og:title" content="FAQ | KAD Multiplier">\n<meta property="og:description" content="Find answers to common questions about KAD Multiplier products, usage, and shipping.">\n<meta property="og:type" content="website">"""
    },
    "returns.html": {
        "title": "<title>Return Policy | KAD Multiplier</title>",
        "meta": """<meta name="description" content="Return and refund policy for KAD Multiplier products. Learn about our hassle-free return process.">\n<meta property="og:title" content="Return Policy | KAD Multiplier">\n<meta property="og:description" content="Learn about KAD Multiplier's return and refund policy for all products.">\n<meta property="og:type" content="website">"""
    },
    "shipping.html": {
        "title": "<title>Shipping & Delivery | KAD Multiplier</title>",
        "meta": """<meta name="description" content="Shipping and delivery information for KAD Multiplier products across India.">\n<meta property="og:title" content="Shipping & Delivery | KAD Multiplier">\n<meta property="og:description" content="Learn about KAD Multiplier shipping rates, delivery times, and coverage areas.">\n<meta property="og:type" content="website">"""
    },
    "terms.html": {
        "title": "<title>Terms of Service | KAD Multiplier</title>",
        "meta": """<meta name="description" content="Terms and conditions for using KAD Multiplier website and purchasing our products.">\n<meta property="og:title" content="Terms of Service | KAD Multiplier">\n<meta property="og:description" content="Read the terms and conditions for KAD Multiplier products and services.">\n<meta property="og:type" content="website">"""
    },
    "privacy.html": {
        "title": "<title>Privacy Policy | KAD Multiplier</title>",
        "meta": """<meta name="description" content="Privacy policy for KAD Multiplier. Learn how we collect, use, and protect your personal information.">\n<meta property="og:title" content="Privacy Policy | KAD Multiplier">\n<meta property="og:description" content="KAD Multiplier's privacy policy - how we handle your data securely.">\n<meta property="og:type" content="website">"""
    },
    "product-info.html": {
        "title": "<title>Product Details | KAD Multiplier</title>",
        "meta": """<meta name="description" content="Detailed product information about KAD Multiplier - ingredients, usage instructions, and benefits for your crops.">\n<meta property="og:title" content="Product Details | KAD Multiplier">\n<meta property="og:description" content="Learn about KAD Multiplier's ingredients, application methods, and crop benefits.">\n<meta property="og:type" content="website">"""
    },
    "login.html": {
        "title": "<title>Login | KAD Multiplier</title>",
        "meta": """<meta name="description" content="Log in to your KAD Multiplier account to manage orders, addresses, and wishlist.">\n<meta property="og:title" content="Login | KAD Multiplier">\n<meta property="og:description" content="Sign in to your KAD Multiplier account.">\n<meta property="og:type" content="website">"""
    },
    "register.html": {
        "title": "<title>Register | KAD Multiplier</title>",
        "meta": """<meta name="description" content="Create your KAD Multiplier account to start ordering premium bio-stimulant products.">\n<meta property="og:title" content="Register | KAD Multiplier">\n<meta property="og:description" content="Sign up for a KAD Multiplier account today.">\n<meta property="og:type" content="website">"""
    },
    "forgot-password.html": {
        "title": "<title>Reset Password | KAD Multiplier</title>",
        "meta": """<meta name="description" content="Reset your KAD Multiplier account password.">\n<meta property="og:title" content="Reset Password | KAD Multiplier">\n<meta property="og:description" content="Reset your KAD Multiplier account password securely.">\n<meta property="og:type" content="website">"""
    }
}

for fname in files:
    filepath = os.path.join(r"c:\Projects\Project Multiplier", fname)
    if not os.path.exists(filepath):
        print(f"Skipping {fname} - not found")
        continue
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Update Title and Meta tags
    content = re.sub(r"<title>.*?</title>", "", content, flags=re.IGNORECASE|re.DOTALL)
    
    viewport_match = re.search(r'<meta[^>]*name=["\']viewport["\'][^>]*>', content, flags=re.IGNORECASE)
    
    insert_str = "\n" + seo_data[fname]["meta"] + "\n" + seo_data[fname]["title"]
    
    if viewport_match:
        pos = viewport_match.end()
        content = content[:pos] + insert_str + content[pos:]
    else:
        head_end = content.find("</head>")
        if head_end != -1:
            content = content[:head_end] + insert_str + "\n" + content[head_end:]

    # 2. Add/standardize Footer
    if re.search(r"<footer.*?>.*?</footer>", content, flags=re.IGNORECASE|re.DOTALL):
        content = re.sub(r"<footer.*?>.*?</footer>", footer_html, content, flags=re.IGNORECASE|re.DOTALL)
    else:
        body_end = content.find("</body>")
        if body_end != -1:
            content = content[:body_end] + footer_html + "\n" + content[body_end:]

    # 3. Standardize navigation on policy pages
    if fname in policy_pages:
        new_top_bar = '''<div class="top-bar">
    <a href="/">← Back to KAD Multiplier</a>
    <span style="font-size:0.85rem;opacity:0.8;">Need Help? Call <a href="tel:+918088775223" style="color:inherit;text-decoration:none;">+91 8088775223</a> | WhatsApp <a href="https://wa.me/918088055223" style="color:inherit;text-decoration:none;">+91 8088055223</a></span>
  </div>'''
        content = re.sub(r'<div class=["\']top-bar["\']>.*?</div>', new_top_bar, content, flags=re.IGNORECASE|re.DOTALL)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Updated {fname}")
