import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-center"
      swipeDirection="right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-[#13112B] group-[.toaster]:border-[#E7F7E9] group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl group-[.toaster]:border",
          description: "group-[.toast]:text-[#13112B]/60",
          actionButton: "group-[.toast]:bg-[#36B531] group-[.toast]:text-white group-[.toast]:rounded-xl group-[.toast]:hover:bg-[#2DA029]",
          cancelButton: "group-[.toast]:bg-[#F9FAF9] group-[.toast]:text-[#13112B] group-[.toast]:rounded-xl group-[.toast]:border-[#E7F7E9] group-[.toast]:hover:bg-[#E7F7E9]",
          success: "group-[.toaster]:bg-white group-[.toaster]:border-[#36B531] group-[.toaster]:text-[#13112B]",
          error: "group-[.toaster]:bg-white group-[.toaster]:border-[#E74C3C] group-[.toaster]:text-[#13112B]",
          warning: "group-[.toaster]:bg-white group-[.toaster]:border-[#F59E0B] group-[.toaster]:text-[#13112B]",
          info: "group-[.toaster]:bg-white group-[.toaster]:border-[#3B82F6] group-[.toaster]:text-[#13112B]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
