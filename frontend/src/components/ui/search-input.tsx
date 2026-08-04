import { forwardRef, type InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export const SearchInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <Input ref={ref} type="search" icon={<Search className="h-4 w-4" />} className={className} {...props} />
  ),
);
SearchInput.displayName = "SearchInput";
