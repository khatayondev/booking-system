"use client";

import * as React from "react";
import {
  MapPin,
  Phone,
  MessageSquare,
  Clock,
  Send,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/controls";

export default function ContactPage() {
  const [formSubmitted, setFormSubmitted] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    phone: "",
    subject: "Bridal Inquiry",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    setFormSubmitted(true);
  };

  return (
    <div className="space-y-10 sm:space-y-14 py-6 sm:py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
          <MapPin className="w-3.5 h-3.5 text-[#1E1E1E]" />
          <span>East Legon • Greater Accra</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-[#1E1E1E] tracking-tight">
          Get in Touch
        </h1>
        <p className="text-xs sm:text-sm text-[#71717A] leading-relaxed">
          Questions about bridal bookings, gown fittings, or custom appointments? We are here to assist you daily.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Info Cards */}
        <div className="lg:col-span-5 space-y-4">
          <Card variant="white" className="p-6 space-y-4 rounded-[28px]">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[#F4F4F6] text-[#1E1E1E] flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#1E1E1E]">East Legon Flagship</h3>
                <p className="text-xs text-[#71717A] leading-relaxed">
                  Lagos Avenue, East Legon, Accra, Ghana
                </p>
                <a
                  href="https://maps.google.com/?q=East+Legon+Accra"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-[11px] font-bold text-[#1E1E1E] hover:underline pt-1"
                >
                  Open in Google Maps →
                </a>
              </div>
            </div>
          </Card>

          <Card variant="white" className="p-6 space-y-4 rounded-[28px]">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[#F4F4F6] text-[#1E1E1E] flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#1E1E1E]">Phone & WhatsApp</h3>
                <p className="text-xs text-[#71717A]">
                  Direct calls:{" "}
                  <a href="tel:+233241112233" className="font-bold text-[#1E1E1E] hover:underline">
                    +233 (0) 24 111 2233
                  </a>
                </p>
                <div className="pt-2">
                  <a
                    href="https://wa.me/233241112233?text=Hello%20Ghana%20and%20Beyond,%20I%20would%20like%20to%20inquire%20about%20a%20booking"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold gap-1.5 h-8 px-4 cursor-pointer shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat on WhatsApp</span>
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </Card>

          <Card variant="white" className="p-6 space-y-4 rounded-[28px]">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[#F4F4F6] text-[#1E1E1E] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#1E1E1E]">Studio Hours</h3>
                <div className="text-xs text-[#71717A] space-y-0.5">
                  <p className="flex justify-between gap-4">
                    <span>Monday – Saturday:</span>
                    <span className="font-bold text-[#1E1E1E]">9:00 AM – 7:00 PM</span>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span>Sunday:</span>
                    <span className="font-bold text-[#1E1E1E]">12:00 PM – 6:00 PM</span>
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-7">
          <Card variant="glass" className="p-6 sm:p-8 rounded-[32px]">
            {formSubmitted ? (
              <div className="py-12 text-center space-y-4 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-[#1E1E1E]">
                  Message Received!
                </h3>
                <p className="text-xs text-[#71717A] max-w-sm mx-auto leading-relaxed">
                  Thank you, <span className="font-bold text-[#1E1E1E]">{formData.name}</span>. Our studio manager will reach out via phone/WhatsApp at{" "}
                  <span className="font-bold text-[#1E1E1E]">{formData.phone}</span> shortly.
                </p>
                <div className="pt-2">
                  <Button
                    variant="blackPill"
                    size="sm"
                    onClick={() => {
                      setFormSubmitted(false);
                      setFormData({ name: "", phone: "", subject: "Bridal Inquiry", message: "" });
                    }}
                    className="cursor-pointer"
                  >
                    Send Another Note
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-[#1E1E1E]">Send us a Note</h3>
                  <p className="text-xs text-[#71717A]">
                    Fill out the form below and we will get back to you within 2 business hours.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact-name">Your Full Name *</Label>
                    <Input
                      id="contact-name"
                      required
                      placeholder="e.g. Ama Serwaa"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="contact-phone">Ghana Phone / WhatsApp *</Label>
                    <Input
                      id="contact-phone"
                      required
                      placeholder="024 123 4567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="contact-subject">Topic / Service Inquiry</Label>
                  <select
                    id="contact-subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-2xl border border-[#E4E4E7] bg-white text-xs font-semibold text-[#1E1E1E] focus:outline-hidden focus:border-[#1E1E1E]"
                  >
                    <option value="Bridal Inquiry">Bridal Glam Consultation & Trials</option>
                    <option value="Gown Fitting">Designer Evening Gown Fitting</option>
                    <option value="Lashes & Hair">Lash Extensions or Hair Silk Press</option>
                    <option value="Group Booking">Bridesmaids / Group Pamper Event</option>
                    <option value="Other">Other Inquiries</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="contact-message">Message or Special Requests</Label>
                  <Textarea
                    id="contact-message"
                    rows={4}
                    placeholder="Tell us about your event date, required look, or questions..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>

                <Button
                  type="submit"
                  variant="blackPill"
                  size="md"
                  className="w-full gap-2 text-xs font-bold shadow-md cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Message to Concierge</span>
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
