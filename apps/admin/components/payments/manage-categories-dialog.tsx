"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Tags, Plus } from "lucide-react";
import { usePaymentCategories, useCreatePaymentCategory, useUpdatePaymentCategory } from "@/hooks/use-payments";
import { useToast } from "@/components/ui/toast";
import { ApiClientError } from "@/lib/auth-context";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

const CATEGORY_TYPES = ["DUES", "DONATION", "PROJECT_CONTRIBUTION", "FUNDRAISING", "EVENT_FEE", "LEVY", "CUSTOM"];

const categorySchema = z.object({
  name: z.string().min(2, "Enter a name"),
  type: z.string().min(1, "Choose a type"),
  isRecurring: z.boolean().default(false),
  defaultAmount: z.coerce.number().positive().optional().or(z.literal("")),
});
type CategoryFormValues = z.infer<typeof categorySchema>;

export function ManageCategoriesDialog() {
  const [open, setOpen] = useState(false);
  const { data: categories } = usePaymentCategories();
  const createCategory = useCreatePaymentCategory();
  const updateCategory = useUpdatePaymentCategory();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({ resolver: zodResolver(categorySchema), defaultValues: { isRecurring: false } });

  async function onSubmit(values: CategoryFormValues) {
    try {
      await createCategory.mutateAsync({
        name: values.name,
        type: values.type,
        isRecurring: values.isRecurring,
        defaultAmount: values.defaultAmount ? Math.round(Number(values.defaultAmount) * 100) : undefined,
      });
      toast({ title: "Category created", variant: "success" });
      reset();
    } catch (err) {
      toast({
        title: "Couldn't create category",
        description: err instanceof ApiClientError ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  }

  async function toggleActive(categoryId: string, isActive: boolean) {
    try {
      await updateCategory.mutateAsync({ categoryId, isActive: !isActive });
    } catch (err) {
      toast({ title: "Couldn't update category", description: err instanceof ApiClientError ? err.message : undefined, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Tags className="h-4 w-4" />
          Manage categories
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment categories</DialogTitle>
          <DialogDescription>Dues, donations, and other payment types members can pay into.</DialogDescription>
        </DialogHeader>

        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {categories?.data.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">{cat.name}</p>
                <p className="text-xs text-muted-foreground">
                  {cat.type}
                  {cat.defaultAmount ? ` · ${formatMoney(cat.defaultAmount)}` : ""}
                  {cat.isRecurring ? " · Recurring" : ""}
                </p>
              </div>
              <button onClick={() => toggleActive(cat.id, cat.isActive)}>
                <Badge variant={cat.isActive ? "success" : "secondary"} className="cursor-pointer">
                  {cat.isActive ? "Active" : "Inactive"}
                </Badge>
              </button>
            </div>
          ))}
          {!categories?.data.length && <p className="py-4 text-center text-sm text-muted-foreground">No categories yet.</p>}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 border-t border-border pt-4">
          <p className="text-sm font-medium">Add a category</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input id="cat-name" placeholder="e.g. Annual Dues" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-type">Type</Label>
              <Select onValueChange={(v) => setValue("type", v, { shouldValidate: true })}>
                <SelectTrigger id="cat-type">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-amount">Default amount (GHS, optional)</Label>
              <Input id="cat-amount" type="number" step="0.01" placeholder="50.00" {...register("defaultAmount")} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("isRecurring")} className="h-4 w-4 rounded border-input" />
            Recurring (e.g. monthly or annual dues)
          </label>
          <Button type="submit" disabled={isSubmitting} className="mt-1">
            <Plus className="h-4 w-4" />
            {isSubmitting ? "Adding…" : "Add category"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
