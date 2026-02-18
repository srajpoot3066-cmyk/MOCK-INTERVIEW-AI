import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search, Check, ZoomIn, ChevronLeft, ChevronRight
} from "lucide-react";
import {
  RESUME_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type ResumeTemplate,
  type TemplateCategory,
} from "@/lib/resume-templates";
import { ResumePreview } from "@/components/resume-preview";

interface TemplateGalleryProps {
  onSelect: (template: ResumeTemplate) => void;
  selectedId?: string;
}

export function TemplateGallery({ onSelect, selectedId }: TemplateGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<ResumeTemplate | null>(null);

  const filtered = useMemo(() => {
    let list = RESUME_TEMPLATES;
    if (activeCategory !== "all") {
      list = list.filter((t) => t.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.features.some((f) => f.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: RESUME_TEMPLATES.length };
    TEMPLATE_CATEGORIES.forEach((c) => {
      counts[c.id] = RESUME_TEMPLATES.filter((t) => t.category === c.id).length;
    });
    return counts;
  }, []);

  const currentPreviewIndex = useMemo(() => {
    if (!previewTemplate) return -1;
    return filtered.findIndex(t => t.id === previewTemplate.id);
  }, [previewTemplate, filtered]);

  const navigatePreview = useCallback((direction: "prev" | "next") => {
    if (currentPreviewIndex < 0) return;
    const newIndex = direction === "prev"
      ? (currentPreviewIndex - 1 + filtered.length) % filtered.length
      : (currentPreviewIndex + 1) % filtered.length;
    setPreviewTemplate(filtered[newIndex]);
  }, [currentPreviewIndex, filtered]);

  const handleCardClick = (template: ResumeTemplate) => {
    setPreviewTemplate(template);
  };

  const handleSelectFromPreview = () => {
    if (previewTemplate) {
      onSelect(previewTemplate);
      setPreviewTemplate(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold tracking-tight" data-testid="text-template-title">
            Choose a Template
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {RESUME_TEMPLATES.length} professional templates across {TEMPLATE_CATEGORIES.length} categories
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-sm"
            data-testid="input-search-templates"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant={activeCategory === "all" ? "default" : "outline"}
          onClick={() => setActiveCategory("all")}
          data-testid="button-category-all"
        >
          All ({categoryCounts["all"]})
        </Button>
        {TEMPLATE_CATEGORIES.map((cat) => (
          <Button
            key={cat.id}
            size="sm"
            variant={activeCategory === cat.id ? "default" : "outline"}
            onClick={() => setActiveCategory(cat.id)}
            data-testid={`button-category-${cat.id}`}
          >
            {cat.label} ({categoryCounts[cat.id] || 0})
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">No templates found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((template) => {
            const isSelected = selectedId === template.id;

            return (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all duration-200 group ${
                  isSelected ? "ring-2 ring-primary" : "hover-elevate"
                }`}
                onClick={() => handleCardClick(template)}
                data-testid={`card-template-${template.id}`}
              >
                <CardContent className="p-0">
                  <div className="relative aspect-[3/4] rounded-t-xl overflow-hidden border-b">
                    <ResumePreview template={template} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <ZoomIn className="w-6 h-6 text-white drop-shadow-lg" />
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-md">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium truncate">{template.name}</span>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0">
                        {TEMPLATE_CATEGORIES.find(c => c.id === template.category)?.label}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-1 leading-relaxed">
                      {template.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!previewTemplate} onOpenChange={(open) => { if (!open) setPreviewTemplate(null); }}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 overflow-hidden flex flex-col gap-0">
          <DialogTitle className="sr-only">
            {previewTemplate?.name || "Template Preview"}
          </DialogTitle>
          {previewTemplate && (
            <>
              <div className="flex items-center justify-between gap-4 px-5 py-3 border-b shrink-0">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold truncate">{previewTemplate.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{previewTemplate.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-[10px]">
                    {TEMPLATE_CATEGORIES.find(c => c.id === previewTemplate.category)?.label}
                  </Badge>
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-6">
                <div className="w-full max-w-2xl bg-white rounded-md shadow-lg overflow-hidden">
                  <ResumePreview template={previewTemplate} fullSize />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 px-5 py-3 border-t shrink-0">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigatePreview("prev")}
                    data-testid="button-preview-prev"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigatePreview("next")}
                    data-testid="button-preview-next"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {currentPreviewIndex + 1} of {filtered.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewTemplate(null)}
                    data-testid="button-preview-close"
                  >
                    Close
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSelectFromPreview}
                    data-testid="button-preview-select"
                  >
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Use This Template
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
