# Aura Beauty Studio - Pre-Launch Manual Acceptance Testing Guide

**Target Audience**: Studio Owner (Akosua Addo), General Manager, Head Receptionist  
**Purpose**: Execute these real-world validation tests before opening bookings to the public.  
**Estimated Time**: 45 minutes

---

## 📋 Acceptance Test Checklist

### 1. Public Website & Mobile Booking Flow
| # | Action | Expected Result | Pass / Fail |
| :- | :--- | :--- | :--- |
| **1.1** | Open `https://aurastudio.gh` on a smartphone (iPhone Safari / Android Chrome). | Page loads rapidly with black/gold luxury aesthetics; images render crisp; layout fits 360px screen without horizontal scroll. | [ ] |
| **1.2** | Tap **"Book Appointment"** button on the home banner. | Opens 5-step booking wizard at `/book`. | [ ] |
| **1.3** | Select **"Bridal Soft Glam"** service and check **"Luxury Lash Mink Add-on"**. | Duration updates dynamically (+30m); total price reflects service + add-on GHS total. | [ ] |
| **1.4** | Select **"Any Available Stylist"** and choose a date next week. | Time slots load in 30-minute intervals; closed days/hours are disabled; breaks are hidden. | [ ] |
| **1.5** | Select a 2:00 PM slot and enter client details (Name, Ghana phone `024...`, Email). | Slot hold timer appears (10:00 countdown); phone format validates. | [ ] |

---

### 2. Live Payment & Confirmation
| # | Action | Expected Result | Pass / Fail |
| :- | :--- | :--- | :--- |
| **2.1** | Proceed to checkout and select **MTN Mobile Money**. | Paystack Ghana checkout modal opens with GHS amount. | [ ] |
| **2.2** | Complete payment prompt on mobile phone. | Redirects to `/booking/confirmed` showing reference `AUR-XXXXXX`, stylist name, date/time, and Google Maps pin in East Legon. | [ ] |
| **2.3** | Check SMS inbox on test phone. | Instant SMS arrives: *"Hello [Name], your Aura Studio booking [AUR-XXXXXX] for Bridal Glam is confirmed on [Date] at [Time]. Manage: [Link]"*. | [ ] |
| **2.4** | Tap **"Add to Calendar"** button on confirmation page. | Downloads `.ics` file; opens Apple/Google Calendar with prefilled appointment details and address. | [ ] |

---

### 3. Customer Self-Service & Cancellation Policy
| # | Action | Expected Result | Pass / Fail |
| :- | :--- | :--- | :--- |
| **3.1** | Click private manage link from SMS or visit `/lookup` entering reference + phone. | Customer self-service portal opens showing booking status, deposit paid, and outstanding balance. | [ ] |
| **3.2** | Click **"Reschedule Appointment"** for a slot > 24 hours away. | Availability calendar opens; permits choosing a new slot without penalty. | [ ] |
| **3.3** | Test cancellation outside 24h window (> 24 hours prior to slot). | System displays *"Free Cancellation: 100% deposit will be refunded to your original payment method"*. | [ ] |
| **3.4** | Test cancellation inside 24h window (< 24 hours prior to slot). | System displays *"Late Cancellation: Deposit is forfeited in accordance with studio policy"*. | [ ] |

---

### 4. Reception Point of Sale (POS)
| # | Action | Expected Result | Pass / Fail |
| :- | :--- | :--- | :--- |
| **4.1** | Log in at `/login` as Staff (`reception@aurastudio.gh`) on POS iPad/laptop. | Lands on `/dashboard`; POS tab is accessible in sidebar. | [ ] |
| **4.2** | Open `/pos` and click a treatment to add to cart. | Item appears in right-hand cart with quantity and GHS price. | [ ] |
| **4.3** | Apply a 5% promotional discount. | Cart subtotal recalculates immediately. | [ ] |
| **4.4** | Attempt to enter a 15% discount as Staff. | System blocks with validation error: *"Staff discount limit is 5%. Manager approval required for larger discounts."* | [ ] |
| **4.5** | Complete checkout with **Cash**. | POS emits digital thermal receipt with receipt number, breakdown, and print option. | [ ] |

---

### 5. Remote Payment Request via SMS
| # | Action | Expected Result | Pass / Fail |
| :- | :--- | :--- | :--- |
| **5.1** | As Manager/Owner, navigate to `/bookings` or Payment Requests. | Click **"Generate Payment Request"**. | [ ] |
| **5.2** | Enter client name, phone number, GHS amount, and note: *"Custom Bridal Veil Balance"*. | System creates secure single-use payment link and queues SMS dispatch. | [ ] |
| **5.3** | Open payment link on mobile device. | Luxury branded checkout page opens displaying studio logo, line item note, and Paystack button. | [ ] |

---

### 6. Owner Dashboard & Financial Reports
| # | Action | Expected Result | Pass / Fail |
| :- | :--- | :--- | :--- |
| **6.1** | Log in as Owner (`owner@aurastudio.gh`). | Owner Onboarding Checklist appears at top of dashboard with interactive progress bar. | [ ] |
| **6.2** | Navigate to `/reports`. | Revenue charts display gross revenue, refunds deducted, and net revenue figures. | [ ] |
| **6.3** | Click **"Export CSV"** and **"Export PDF"**. | Clean report exports download; numbers reconcile to the pesewa with payments ledger. | [ ] |
| **6.4** | Navigate to `/audit` (Audit Log). | Log shows full chronological entries for every booking created, discount applied, and user login with timestamp and IP address. | [ ] |

---

## ✍️ Sign-Off
- **Tested By**: ___________________________
- **Date**: _______________________________
- **Go-Live Decision**: [ ] APPROVED FOR PUBLIC LAUNCH   [ ] PENDING REVISIONS
