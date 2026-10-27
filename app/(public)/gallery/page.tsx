import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Gallery & Studio Looks | Aura Beauty Studio East Legon",
  description:
    "Explore our lookbook: bridal transformations, Russian volume lash sets, couture evening gown rentals, and our modern Accra beauty salon.",
};

export default function GalleryPage() {
  const galleryItems = [
    {
      id: "look-1",
      title: "Royal Ghanaian Bridal Glam",
      category: "Bridal",
      image: "/images/hero_bridal_glam.jpg",
      description: "Luminous skin prep, waterproof HD airbrush finish, and bespoke soft smoky eye.",
      serviceId: "svc-bridal",
    },
    {
      id: "look-2",
      title: "Russian Volume Lashes & Brow Art",
      category: "Lashes & Brows",
      image: "/images/lashes_studio.jpg",
      description: "Custom lightweight handcrafted fans paired with architectural brow tinting.",
      serviceId: "svc-volume-lashes",
    },
    {
      id: "look-3",
      title: "Couture Emerald Beaded Evening Gown",
      category: "Gown Rentals",
      image: "/images/luxury_gown_rental.jpg",
      description: "Bespoke emerald green corset gown adorned with bugle beads and crystal accents.",
      serviceId: "svc-emerald-gown",
    },
    {
      id: "look-4",
      title: "Aura Studio Interior & Private Suites",
      category: "Studio",
      image: "/images/salon_interior_accra.jpg",
      description: "Frosted glass partitions, backlit arch mirrors, and private VIP bridal glam suites in East Legon.",
      serviceId: "svc-silk-press",
    },
  ];

  return (
    <div className="space-y-10 sm:space-y-14 py-6 sm:py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Lookbook & Inspiration</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-[#1E1E1E] tracking-tight">
          Studio Gallery
        </h1>
        <p className="text-xs sm:text-sm text-[#71717A] leading-relaxed">
          Real artistry from our master stylists, lash technicians, and luxury gown collection at our East Legon flagship.
        </p>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {galleryItems.map((item) => (
          <div
            key={item.id}
            className="group rounded-[32px] overflow-hidden border border-black/5 bg-white shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#1E1E1E]">
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/90 backdrop-blur-xs text-[11px] font-bold text-[#1E1E1E] shadow-sm">
                {item.category}
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#1E1E1E] group-hover:text-black">
                  {item.title}
                </h3>
                <p className="text-xs text-[#71717A] leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="pt-3 border-t border-black/5 flex items-center justify-between">
                <span className="text-xs text-[#71717A] font-medium">
                  East Legon Flagship
                </span>
                <Link href={`/book?serviceId=${item.serviceId}`}>
                  <Button
                    size="sm"
                    className="bg-[#1E1E1E] text-white hover:bg-black rounded-full px-4 text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Book This Look</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Booking Prompt */}
      <Card variant="glass" className="p-8 text-center space-y-4 rounded-[32px]">
        <h3 className="text-lg sm:text-xl font-black text-[#1E1E1E]">
          Have a specific reference photo?
        </h3>
        <p className="text-xs text-[#71717A] max-w-md mx-auto">
          Our senior artists can recreate or customize any reference image. Start your booking and add notes or link your inspiration photos in checkout.
        </p>
        <Link href="/book">
          <Button variant="blackPill" size="md" className="gap-2 text-xs font-bold shadow-md cursor-pointer">
            <span>Reserve Master Artist</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </Card>
    </div>
  );
}
