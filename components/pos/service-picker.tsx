"use client";

import * as React from "react";
import { Search, Plus, Clock, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { formatPesewas } from "@/lib/money";
import type { PosItemInput, PosItemAddonInput } from "@/lib/pos/types";

export interface PosCatalogService {
  id: string;
  name: string;
  pricePesewas: number;
  durationMin: number;
  categoryId: string;
  categoryName: string;
  addons: Array<{
    id: string;
    name: string;
    pricePesewas: number;
    durationMin: number;
  }>;
}

export function ServicePicker({
  services,
  categories,
  onAddToCart,
}: {
  services: PosCatalogService[];
  categories: Array<{ id: string; name: string }>;
  onAddToCart: (item: PosItemInput) => void;
}) {
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [expandedServiceId, setExpandedServiceId] = React.useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = React.useState<Record<string, PosItemAddonInput[]>>({});

  const filteredServices = services.filter((s) => {
    const matchesCat = selectedCategory === "all" || s.categoryId === selectedCategory;
    const matchesQuery =
      !searchQuery.trim() ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleToggleAddon = (serviceId: string, addon: PosItemAddonInput) => {
    setSelectedAddons((prev) => {
      const current = prev[serviceId] || [];
      const exists = current.some((a) => a.id === addon.id);
      if (exists) {
        return {
          ...prev,
          [serviceId]: current.filter((a) => a.id !== addon.id),
        };
      } else {
        return {
          ...prev,
          [serviceId]: [...current, addon],
        };
      }
    });
  };

  const handleAddService = (service: PosCatalogService) => {
    const addons = selectedAddons[service.id] || [];
    onAddToCart({
      serviceId: service.id,
      serviceName: service.name,
      pricePesewas: service.pricePesewas,
      durationMin: service.durationMin,
      addOns: addons,
    });

    // Reset chosen addons for this service card
    setSelectedAddons((prev) => ({
      ...prev,
      [service.id]: [],
    }));
  };

  return (
    <div className="space-y-4">
      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search treatments or add-ons..."
            className="pl-9 h-10 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategory === "all"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          }`}
        >
          All Categories ({services.length})
        </button>
        {categories.map((cat) => {
          const count = services.filter((s) => s.categoryId === cat.id).length;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredServices.map((service) => {
          const isExpanded = expandedServiceId === service.id;
          const chosenAddons = selectedAddons[service.id] || [];
          const addonSumPesewas = chosenAddons.reduce((sum, a) => sum + a.pricePesewas, 0);
          const totalCardPesewas = service.pricePesewas + addonSumPesewas;

          return (
            <div
              key={service.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-600 transition-all shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
                      {service.categoryName}
                    </span>
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-white leading-tight mt-0.5">
                      {service.name}
                    </h3>
                  </div>
                  <span className="font-bold text-sm text-zinc-900 dark:text-white shrink-0">
                    {formatPesewas(service.pricePesewas)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{service.durationMin} mins</span>
                </div>

                {/* Add-ons toggle section */}
                {service.addons && service.addons.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedServiceId(isExpanded ? null : service.id)
                      }
                      className="w-full flex items-center justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                    >
                      <span className="flex items-center gap-1">
                        <Plus className="w-3 h-3 text-amber-500" />
                        <span>Add-ons ({service.addons.length})</span>
                        {chosenAddons.length > 0 && (
                          <span className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                            +{chosenAddons.length}
                          </span>
                        )}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-1.5 pl-1 max-h-36 overflow-y-auto pr-1">
                        {service.addons.map((addon) => {
                          const isSelected = chosenAddons.some((a) => a.id === addon.id);
                          return (
                            <button
                              key={addon.id}
                              type="button"
                              onClick={() => handleToggleAddon(service.id, addon)}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-[11px] transition-all text-left ${
                                isSelected
                                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-medium"
                                  : "bg-zinc-50 text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <div
                                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                    isSelected
                                      ? "border-white bg-white text-zinc-900 dark:border-zinc-900 dark:bg-zinc-900 dark:text-white"
                                      : "border-zinc-300 dark:border-zinc-600"
                                  }`}
                                >
                                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </div>
                                <span>{addon.name}</span>
                              </div>
                              <span className="shrink-0 font-semibold">
                                +{formatPesewas(addon.pricePesewas)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Add to Cart button */}
              <div className="mt-4 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                {addonSumPesewas > 0 ? (
                  <div className="text-[11px] text-zinc-500">
                    Total: <strong className="text-zinc-900 dark:text-white">{formatPesewas(totalCardPesewas)}</strong>
                  </div>
                ) : (
                  <div />
                )}
                <Button
                  type="button"
                  onClick={() => handleAddService(service)}
                  className="bg-zinc-900 text-white hover:bg-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-semibold h-8 px-3 rounded-xl flex items-center gap-1 shadow-xs ml-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Sale</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredServices.length === 0 && (
        <div className="p-8 text-center text-zinc-400 text-xs bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
          No services found matching &quot;{searchQuery}&quot;
        </div>
      )}
    </div>
  );
}
