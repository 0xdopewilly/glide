/** Dark Glide shell — used on sign-in / sign-up. */
export const clerkAppearance = {
  variables: {
    colorBackground: "#0c0c10",
    colorInputBackground: "rgba(255,255,255,0.06)",
    colorInputText: "#f4f4f5",
    colorText: "#f4f4f5",
    colorTextSecondary: "#9ca3af",
    colorPrimary: "#6eb8f0",
    colorDanger: "#f87171",
    borderRadius: "0.85rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "shadow-none w-full",
    card: "bg-transparent shadow-none border-0 gap-4 p-0",
    headerTitle: "text-[1.5rem] font-semibold tracking-tight text-left",
    headerSubtitle: "text-left text-[15px] opacity-80",
    socialButtonsBlockButton:
      "border rounded-2xl py-3 h-auto bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.08)]",
    formButtonPrimary:
      "rounded-2xl py-3 h-auto text-sm font-semibold normal-case",
    formFieldInput:
      "rounded-xl border py-3 bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.08)]",
    footerActionLink: "text-[#6eb8f0] font-medium",
    dividerLine: "bg-[rgba(255,255,255,0.08)]",
    dividerText: "text-xs uppercase tracking-wider opacity-60",
    identityPreviewEditButton: "text-[#6eb8f0]",
  },
};
