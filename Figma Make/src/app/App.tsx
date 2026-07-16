import { useState, useRef, useCallback } from "react";
import imgLogo from "@/imports/LogInProcess/9afb6d3fde7dd556c49fa0e59f5f573dcb3ccb24.png";
import svgPaths from "@/imports/LogInProcess/svg-fh1a7h1eyu";
import { Eye, EyeOff, ChevronLeft, HelpCircle, Menu, Settings, BookOpen, Phone, X, ChevronRight, User, ShoppingBag, LogOut, Camera, Pencil } from "lucide-react";
import orderProcessSvgPaths from "@/imports/OrderProcess/svg-3gmx5drd3n";
import imgGCash from "@/imports/Placing/c9c3bbfbabea62c0b04850b59916a35de0066b50.png";
import imgRewardsDecor from "@/imports/Homepage/ae73807e8b7c0bd8a9eb77bf49b3e1eb4bc2a75a.png";
import img11kg from "@/imports/Homepage/4fef47e73564d8b0751c85b7b8863c7d30a759a3.png";
import img27kg from "@/imports/Homepage/3da528e00e565a809d122b9195d2743fa1c7668a.png";
import img5kg from "@/imports/Homepage/9c9b2e63ebb77a00a3e20cded02c6772b09e47ec.png";
import img22kg from "@/imports/Homepage/6a8c64a67feac3faebd594963418b852ee2e339c.png";
import img50kg from "@/imports/Homepage/6fef249ab1e64b9cfd1cb8deec65f70995521bf8.png";
import imgOrderBag from "@/imports/Homepage/7149799d6c90935dba9a70aa87d1ff5a031b798c.png";
import imgPromo from "@/imports/Homepage/5a9a029c1aded2383ee657e2277f52b24a2d3878.png";
import homeSvgPaths from "@/imports/Homepage/svg-49wt6tbt46";
import ordersSvgPaths from "@/imports/MyOrders/svg-5w2lbfkslg";
import imgOrdersCylinder from "@/imports/MyOrders/4fef47e73564d8b0751c85b7b8863c7d30a759a3.png";
import imgOrdersLogo from "@/imports/MyOrders/9afb6d3fde7dd556c49fa0e59f5f573dcb3ccb24.png";
import imgOrdersNavBag from "@/imports/MyOrders/7149799d6c90935dba9a70aa87d1ff5a031b798c.png";
import imgMaya from "@/imports/PaymentMethod/e13ce461f0bb93e70855870e5b84645b982c181d.png";
import imgNotInMood from "@/imports/XFeedback/597bd1ca5789a666d403f04b2ede2399efb027b7.png";
import faqSvgPaths from "@/imports/FaQs/svg-car9oh9w3c";
import imgGuideWave from "@/imports/AppGuide1/89c8da5f5bffc17ba863dc7d9dae7f623fdf83be.png";
import imgGuideRewards from "@/imports/AppGuide2/343bba125e54d925f4021765bcaa22d6e4e13291.png";
import imgGuideOrder from "@/imports/AppGuide4/52bd06997db648f828242811f8492d0f7b711724.png";
import imgGuideQuick from "@/imports/AppGuide5/4abc6c3676e5fb27478e7fa0d5eb290f4bdd0887.png";
import imgRewardNotebook from "@/imports/AllRewards-1/72964511342c34b190d83cdbec8f5d70aaad63aa.png";
import imgRewardCalendar from "@/imports/AllRewards-1/aff6eab658b671f999dccb15c75112252b9bbf45.png";
import imgRewardUmbrella from "@/imports/AllRewards-1/47fc95308c5eb90668735efeb97a9e0ea138b91d.png";
import imgRewardMug from "@/imports/AllRewards-1/4323b611650c1411c721f8e7461f8f9c73ad55bc.png";

type Screen =
  | "login"
  | "signup"
  | "otp"
  | "forgot"
  | "forgot-check"
  | "set-password"
  | "success"
  | "home"
  | "orders"
  | "order-process"
  | "faqs"
  | "profile";

type AccountType = "household" | "commercial";
type InputMode = "email" | "phone";
type OtpVariant = "email" | "phone" | "sms";

interface NavState {
  screen: Screen;
  loginAccount: AccountType;
  loginInput: InputMode;
  signupAccount: AccountType;
  signupInput: InputMode;
  otpVariant: OtpVariant;
  history: Screen[];
  showGuide?: boolean;
  activeTab?: "home" | "rewards" | "orders" | "profile";
}

/* ─────────────────────────────────────────────
   Shared primitives
───────────────────────────────────────────── */

interface GuideStep {
  img: string;
  title: string;
  body: string;
  // null = full dark overlay; topPanelHeight=null means no top panel; bottomPanelTop=null means no bottom panel
  highlight: { topPanelHeight: number | null; bottomPanelTop: number | null } | null;
  cardTopPx: number | null; // null = bottom-anchored above nav
  cropRight?: boolean; // show only right half of mascot image
}

const GUIDE_STEPS: GuideStep[] = [
  {
    img: imgGuideWave,
    title: "Hi! Welcome to Superkalan Gaz App",
    body: "I'm here to guide you in this app, let me show you some cool things here that will help you.",
    highlight: null,
    cardTopPx: null,
  },
  {
    // Spotlight: only the Superkalan Gaz Points card (header stays dark)
    img: imgGuideRewards,
    title: "Rewards & Points",
    body: "You can view your accumulated points and claim awesome rewards from our Rewards Shop!",
    highlight: { topPanelHeight: 108, bottomPanelTop: 270 },
    cardTopPx: 276,
  },
  {
    // Spotlight: "Active Orders" label + order card
    img: imgGuideRewards,
    title: "Active Orders",
    body: "Here you can see your active orders as of the moment. You can view it anytime.",
    highlight: { topPanelHeight: 288, bottomPanelTop: 478 },
    cardTopPx: 485,
  },
  {
    // Spotlight: "Order again" label + horizontal cards row; crop to ? mascot only
    img: imgGuideOrder,
    title: "Ordering Again?",
    body: "Ordering again made easier! Just one click away and you're all set for another order.",
    highlight: { topPanelHeight: 496, bottomPanelTop: 644 },
    cardTopPx: null,
    cropRight: true,
  },
  {
    // Spotlight: "Quick Order" label text only
    img: imgGuideQuick,
    title: "Quick Order",
    body: "Quick orders can be viewed also here! You can choose from a wide variety of high-quality gas tanks.",
    highlight: { topPanelHeight: 662, bottomPanelTop: 698 },
    cardTopPx: 450,
  },
  {
    // Spotlight: bottom nav bar only
    img: imgGuideOrder,
    title: "Navigate with Ease!",
    body: "Our navigation bar gives everything you need from Rewards, checking your active and past orders and viewing your profile.",
    highlight: { topPanelHeight: 732, bottomPanelTop: null },
    cardTopPx: null,
  },
  {
    // No spotlight — full dark overlay
    img: imgGuideWave,
    title: "Need Help?",
    body: "Just click 'Guide' to see this app guide again if ever you feel lost.",
    highlight: null,
    cardTopPx: 110,
  },
];

const GUIDE_DARK = "rgba(0,0,0,0.60)";

function AppGuideOverlay({
  step,
  onNext,
  onBack,
  onClose,
}: {
  step: number;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const data = GUIDE_STEPS[step - 1];
  const isLast = step === GUIDE_STEPS.length;
  const isBottom = data.cardTopPx === null;

  const topH = data.highlight === null ? 9999 : (data.highlight.topPanelHeight ?? 0);
  const botTop = data.highlight === null ? 9999 : (data.highlight.bottomPanelTop ?? 9999);

  const renderPanels = () => (
    <>
      <div
        className="absolute left-0 right-0 top-0 overflow-hidden"
        style={{ height: `${topH}px`, background: GUIDE_DARK, transition: "height 0.4s ease" }}
      />
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{ top: `${botTop}px`, background: GUIDE_DARK, transition: "top 0.4s ease" }}
      />
    </>
  );

  return (
    <div className="absolute inset-0 z-[90]">
      {/* Selective dark panels */}
      {renderPanels()}

      {/* Card + mascot — rendered after panels so it sits above them */}
      <div
        className="absolute left-4 right-4"
        style={isBottom ? { bottom: "115px" } : { top: `${data.cardTopPx}px` }}
      >
        {/* Mascot peeking above card */}
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none overflow-hidden"
          style={{ top: "-88px", width: data.cropRight ? "80px" : "110px", height: "120px", zIndex: 1 }}
        >
          <img
            src={data.img}
            alt=""
            style={data.cropRight
              ? { height: "120px", width: "auto", position: "absolute", right: 0 }
              : { height: "120px", width: "auto" }}
          />
        </div>

        {/* White card */}
        <div key={step} className="bg-white rounded-[12px] px-5 pt-5 pb-5 relative" style={{ animation: "guideFadeSlide 0.28s ease both" }}>
          <style>{`@keyframes guideFadeSlide { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-4 text-[#7d7f7e]"
          >
            <X size={20} />
          </button>

          {/* Progress dots */}
          <div className="flex items-center gap-[5px] mb-4 mt-1">
            {GUIDE_STEPS.map((_, i) => {
              const active = i + 1 === step;
              return (
                <div
                  key={i}
                  style={{
                    width: active ? "28px" : "8px",
                    height: "8px",
                    borderRadius: active ? "4px" : "50%",
                    background: active ? "#007bc1" : "#d9d9d9",
                    flexShrink: 0,
                    transition: "width 0.3s ease, border-radius 0.3s ease, background 0.3s ease",
                  }}
                />
              );
            })}
          </div>

          <p className="font-['Poppins',sans-serif] font-bold text-[17px] text-[#002540] mb-2 leading-snug">
            {data.title}
          </p>

          <p className="font-['Poppins',sans-serif] font-normal text-[13px] leading-relaxed mb-5" style={{ color: "#7d7f7e" }}>
            {data.body}
          </p>

          <div className="flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1 font-['Poppins',sans-serif] font-medium text-[13px] text-[#002540]"
              >
                <ChevronLeft size={16} />
                BACK
              </button>
            ) : (
              <div />
            )}
            <button
              type="button"
              onClick={onNext}
              className="font-['Poppins',sans-serif] font-bold text-[13px] text-white rounded-[8px] px-6 py-2"
              style={{ background: "#007bc1" }}
            >
              {isLast ? "DONE" : "NEXT"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoutConfirmModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
    >
      <div className="relative" style={{ width: "338px" }}>
        {/* Mascot — overlaps card top */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-[52px] z-10" style={{ width: "119px", height: "137px" }}>
          <img
            src={imgNotInMood}
            alt=""
            className="w-full h-full object-cover pointer-events-none"
          />
        </div>

        {/* Card */}
        <div className="bg-white rounded-[10px] pt-[88px] pb-6 px-6 flex flex-col items-center gap-4 relative">
          {/* X close */}
          <button
            type="button"
            onClick={onCancel}
            className="absolute top-3 right-4 text-[#7d7f7e]"
          >
            <X size={22} />
          </button>

          <p className="font-['Poppins',sans-serif] font-bold text-[15px] text-center" style={{ color: "#007bc1" }}>
            Are you sure you want to Log Out?
          </p>

          {/* YES button */}
          <button
            type="button"
            onClick={onConfirm}
            className="w-full h-[38px] rounded-[8px] font-['Poppins',sans-serif] font-bold text-[12px] text-white"
            style={{ background: "#007bc1" }}
          >
            YES, LOG ME OUT
          </button>

          {/* CANCEL button */}
          <button
            type="button"
            onClick={onCancel}
            className="w-full h-[38px] rounded-[8px] border font-['Poppins',sans-serif] font-bold text-[12px] bg-white"
            style={{ borderColor: "#007bc1", color: "#007bc1" }}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

function EyeToggle({
  show,
  onToggle,
}: {
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B979E]"
    >
      {show ? <Eye size={20} /> : <EyeOff size={20} />}
    </button>
  );
}

function FieldInput({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  error,
}: {
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPw ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-1">
      <label className="font-['Poppins',sans-serif] font-normal text-[14px] text-[#002540] leading-none">
        {label}
      </label>
      <div className="relative">
        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-[352px] max-w-full h-[38px] bg-white border rounded-[10px] shadow-[0px_2px_6px_0px_rgba(0,0,0,0.25)] px-3 font-['Poppins',sans-serif] font-normal text-[14px] text-[#002540] placeholder:text-[#b5c5cf] outline-none focus:border-[#007bc1] ${error ? "border-red-500" : "border-[#d9d9d9]"} ${isPassword ? "pr-10" : ""}`}
        />
        {isPassword && (
          <EyeToggle show={showPw} onToggle={() => setShowPw((v) => !v)} />
        )}
      </div>
      {error && (
        <p className="font-['Poppins',sans-serif] font-light text-sm text-[#cc1903]">
          {error}
        </p>
      )}
    </div>
  );
}

function BlueButton({
  label,
  onClick,
  disabled = false,
  className = "",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full h-[52px] rounded-[10px] font-['Poppins',sans-serif] font-semibold text-lg text-white transition-colors ${disabled ? "bg-[#989898] cursor-not-allowed" : "bg-[#007bc1] hover:bg-[#006aad]"} ${className}`}
    >
      {label}
    </button>
  );
}

function DarkButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full h-[56px] rounded-[20px] font-['Poppins',sans-serif] font-medium text-[14px] text-white transition-colors ${disabled ? "bg-[#989898] cursor-not-allowed" : "bg-[#044674] hover:bg-[#033557]"}`}
    >
      {label}
    </button>
  );
}

function EmailPhoneToggle({
  value,
  onChange,
  height = 54,
}: {
  value: InputMode;
  onChange: (v: InputMode) => void;
  height?: number;
}) {
  return (
    <div className="relative bg-[#fafafa] rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex" style={{ height: `${height}px` }}>
      <div
        className={`absolute top-0 h-full w-1/2 bg-[#007bc1] rounded-[10px] transition-transform duration-200 ${value === "phone" ? "translate-x-full" : "translate-x-0"}`}
      />
      <button
        type="button"
        onClick={() => onChange("email")}
        className={`relative z-10 flex-1 font-['Poppins',sans-serif] font-bold text-[16px] transition-colors ${value === "email" ? "text-white" : "text-[#007bc1]"}`}
      >
        Email
      </button>
      <button
        type="button"
        onClick={() => onChange("phone")}
        className={`relative z-10 flex-1 font-['Poppins',sans-serif] font-bold text-[16px] transition-colors ${value === "phone" ? "text-white" : "text-[#007bc1]"}`}
      >
        Phone
      </button>
    </div>
  );
}

function AccountTypeTabs({
  value,
  onChange,
}: {
  value: AccountType;
  onChange: (v: AccountType) => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex">
        <button
          type="button"
          onClick={() => onChange("household")}
          className={`flex-1 text-center font-['Poppins',sans-serif] font-semibold text-base pb-3 ${value === "household" ? "text-[#007bc1]" : "text-[#989898]"}`}
        >
          Household
        </button>
        <button
          type="button"
          onClick={() => onChange("commercial")}
          className={`flex-1 text-center font-['Poppins',sans-serif] font-semibold text-base pb-3 ${value === "commercial" ? "text-[#007bc1]" : "text-[#989898]"}`}
        >
          Commercial
        </button>
      </div>
      <div className="relative h-[1px] bg-[#F1F1F1]">
        <div
          className={`absolute top-0 h-[2px] w-1/2 bg-[#007bc1] transition-transform duration-200 ${value === "commercial" ? "translate-x-full" : "translate-x-0"}`}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   OTP 6-box Input
───────────────────────────────────────────── */

function OtpInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = useCallback(
    (idx: number, ch: string) => {
      const digit = ch.replace(/\D/g, "").slice(-1);
      const next = [...value];
      next[idx] = digit;
      onChange(next);
      if (digit && idx < 5) refs.current[idx + 1]?.focus();
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (idx: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !value[idx] && idx > 0) {
        refs.current[idx - 1]?.focus();
      }
    },
    [value]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      const next = Array(6).fill("");
      pasted.split("").forEach((ch, i) => { next[i] = ch; });
      onChange(next);
      const lastIdx = Math.min(pasted.length, 5);
      refs.current[lastIdx]?.focus();
    },
    [onChange]
  );

  return (
    <div className="flex gap-2 justify-center">
      {Array(6)
        .fill(0)
        .map((_, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className="w-[13vw] max-w-[64px] h-[13vw] max-h-[64px] bg-[#fcfeff] rounded-[6px] shadow-[0px_2px_2px_0px_rgba(0,0,0,0.25)] border border-[#b5c5cf] text-center font-['Inter',sans-serif] font-medium text-3xl text-black outline-none focus:border-[#007bc1] focus:bg-white"
          />
        ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SCREEN: Login
───────────────────────────────────────────── */

function LoginScreen({
  nav,
  onNavigate,
}: {
  nav: NavState;
  onNavigate: (updates: Partial<NavState>) => void;
}) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; phone?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (nav.loginInput === "email" && !email.trim()) e.email = "Email is required";
    if (nav.loginInput === "phone" && !phone.trim()) e.phone = "Phone number is required";
    if (!password.trim()) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignIn = () => {
    if (!validate()) return;
    onNavigate({ screen: "home", history: [], showGuide: true });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#eaf7ff] overflow-y-auto">
      {/* Logo */}
      <div className="flex justify-center pt-10 pb-6">
        <img src={imgLogo} alt="Superkalan Gaz" className="w-48 object-contain" />
      </div>

      {/* Card */}
      <div className="mx-5 bg-white rounded-[20px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] px-6 pt-6 pb-8 flex flex-col gap-5">
        <div className="text-center">
          <h1 className="font-['Poppins',sans-serif] font-bold text-2xl text-[#044674] leading-normal">
            Welcome back!
          </h1>
          <p className="font-['Poppins',sans-serif] font-normal text-sm text-[#044674] leading-normal mt-1">
            Sign in to continue to your account
          </p>
        </div>

        {/* Account type tabs */}
        <AccountTypeTabs
          value={nav.loginAccount}
          onChange={(v) => onNavigate({ loginAccount: v })}
        />

        {/* Email/Phone toggle */}
        <EmailPhoneToggle
          value={nav.loginInput}
          onChange={(v) => { onNavigate({ loginInput: v }); setErrors({}); }}
        />

        {/* Fields */}
        <div className="flex flex-col gap-4">
          {nav.loginInput === "email" ? (
            <FieldInput
              label="Email Address"
              placeholder="Email Address"
              type="email"
              value={email}
              onChange={setEmail}
              error={errors.email}
            />
          ) : (
            <FieldInput
              label="Phone Number"
              placeholder="Phone Number"
              type="tel"
              value={phone}
              onChange={setPhone}
              error={errors.phone}
            />
          )}

          <div className="flex flex-col gap-1">
            <FieldInput
              label="Password"
              placeholder="Password"
              type="password"
              value={password}
              onChange={setPassword}
              error={errors.password}
            />
            <div className="flex justify-end mt-1">
              <button
                type="button"
                onClick={() => onNavigate({ screen: "forgot", history: [...nav.history, "login"] })}
                className="font-['Poppins',sans-serif] font-normal text-[12px] text-[#007bc1] underline decoration-solid underline-offset-2"
              >
                Forgot password?
              </button>
            </div>
          </div>
        </div>

        {/* Sign in button */}
        <BlueButton label="Sign in" onClick={handleSignIn} />

        {/* Sign up link */}
        <p className="text-center font-['Poppins',sans-serif] font-normal text-[11px] text-[#193028]">
          {"Don't have an account? "}
          <button
            type="button"
            onClick={() =>
              onNavigate({
                screen: "signup",
                signupAccount: nav.loginAccount,
                signupInput: nav.loginInput,
                history: [...nav.history, "login"],
              })
            }
            className="font-['Poppins',sans-serif] text-[11px] text-[#2d7dee] underline decoration-solid underline-offset-2"
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SCREEN: Sign Up (bottom sheet style)
───────────────────────────────────────────── */

function SignUpScreen({
  nav,
  onNavigate,
}: {
  nav: NavState;
  onNavigate: (updates: Partial<NavState>) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isCommercial = nav.signupAccount === "commercial";
  const isPhone = nav.signupInput === "phone";

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "First name is required";
    if (!lastName.trim()) e.lastName = "Last name is required";
    if (!address.trim()) e.address = `${isCommercial ? "Business address" : "Address"} is required`;
    if (!contact.trim()) e.contact = isPhone ? "Phone number is required" : "Email is required";
    if (!password.trim()) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    const otpVariant: OtpVariant = isPhone ? (isCommercial ? "sms" : "phone") : "email";
    onNavigate({ screen: "otp", otpVariant, history: [...nav.history, "signup"] });
  };

  const goBack = () => {
    const history = [...nav.history];
    const prev = (history.pop() || "login") as Screen;
    onNavigate({ screen: prev, history });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#eaf7ff] relative overflow-hidden">

      {/* ── Blurred background: exact login screen replica ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="w-full h-full flex flex-col blur-[3px] scale-[1.02] origin-top">
          {/* Logo — matches LoginScreen exactly */}
          <div className="flex justify-center pt-10 pb-6">
            <img src={imgLogo} alt="Superkalan Gaz" className="w-48 object-contain" />
          </div>
          {/* Card — matches LoginScreen mx-5 card exactly */}
          <div className="mx-5 bg-white rounded-[20px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] px-6 pt-6 pb-8 flex flex-col gap-5">
            {/* Welcome text */}
            <div className="text-center">
              <p className="font-['Poppins',sans-serif] font-bold text-2xl text-[#044674]">Welcome back!</p>
              <p className="font-['Poppins',sans-serif] font-normal text-sm text-[#044674] mt-1">Sign in to continue to your account</p>
            </div>
            {/* Account type tabs */}
            <div className="flex flex-col gap-1">
              <div className="flex">
                <div className="flex-1 py-2 border-b-2 border-[#007bc1] flex items-center justify-center">
                  <span className="font-['Poppins',sans-serif] font-semibold text-[13px] text-[#007bc1]">Household</span>
                </div>
                <div className="flex-1 py-2 border-b-2 border-[#d9d9d9] flex items-center justify-center">
                  <span className="font-['Poppins',sans-serif] font-semibold text-[13px] text-[#b5c5cf]">Commercial</span>
                </div>
              </div>
            </div>
            {/* Email/Phone toggle */}
            <div className="relative bg-[#fafafa] rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] h-[54px] flex">
              <div className="absolute top-0 left-0 h-full w-1/2 bg-[#007bc1] rounded-[10px]" />
              <div className="relative z-10 flex-1 flex items-center justify-center">
                <span className="font-['Poppins',sans-serif] font-bold text-[16px] text-white">Email</span>
              </div>
              <div className="relative z-10 flex-1 flex items-center justify-center">
                <span className="font-['Poppins',sans-serif] font-bold text-[16px] text-[#007bc1]">Phone</span>
              </div>
            </div>
            {/* Email field */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-['Poppins',sans-serif] font-normal text-[14px] text-[#002540]">Email Address</span>
                <div className="w-full h-[38px] bg-white border border-[#d9d9d9] rounded-[10px] shadow-[0px_2px_6px_0px_rgba(0,0,0,0.25)] flex items-center px-3">
                  <span className="font-['Poppins',sans-serif] text-[14px] text-[#b5c5cf]">Email Address</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-['Poppins',sans-serif] font-normal text-[14px] text-[#002540]">Password</span>
                <div className="w-full h-[38px] bg-white border border-[#d9d9d9] rounded-[10px] shadow-[0px_2px_6px_0px_rgba(0,0,0,0.25)] flex items-center px-3">
                  <span className="font-['Poppins',sans-serif] text-[14px] text-[#b5c5cf]">••••••••••</span>
                </div>
                <div className="flex justify-end mt-1">
                  <span className="font-['Poppins',sans-serif] text-[12px] text-[#007bc1] underline">Forgot password?</span>
                </div>
              </div>
            </div>
            {/* Sign in button */}
            <div className="w-full h-[52px] rounded-[10px] bg-[#007bc1] flex items-center justify-center">
              <span className="font-['Poppins',sans-serif] font-semibold text-lg text-white">Sign in</span>
            </div>
            {/* Sign up link */}
            <p className="text-center font-['Poppins',sans-serif] text-[11px] text-[#193028]">
              {"Don't have an account? "}
              <span className="text-[#2d7dee] underline">Sign Up</span>
            </p>
          </div>
        </div>
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* ── Bottom sheet — taller, no scroll ── */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px]" style={{ top: "40%" }}>
        <div className="px-5 pt-5 pb-6 h-full flex flex-col justify-between">

          {/* Header — back arrow left, title centered */}
          <div className="relative flex items-center">
            <button type="button" onClick={goBack} className="absolute left-0 text-[#044674]">
              <ChevronLeft size={22} />
            </button>
            <h2 className="w-full text-center font-['Poppins',sans-serif] font-bold text-[16px] text-[#044674]">
              Create a {isCommercial ? "Commercial" : "Household"} Account
            </h2>
          </div>

          {/* Email/Phone toggle — reduced width, centered */}
          <div className="mx-4">
            <EmailPhoneToggle
              value={nav.signupInput}
              onChange={(v) => { onNavigate({ signupInput: v }); setErrors({}); }}
              height={42}
            />
          </div>

          {/* First Name | Last Name — extra top gap from toggle */}
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1">
              <label className="font-['Poppins',sans-serif] font-normal text-[14px] text-[#002540] leading-none">First Name</label>
              <input
                type="text"
                placeholder="Juan"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={`w-full h-[38px] bg-white border rounded-[10px] shadow-[0px_2px_6px_0px_rgba(0,0,0,0.25)] px-3 font-['Poppins',sans-serif] font-normal text-[14px] text-[#002540] placeholder:text-[#b5c5cf] outline-none focus:border-[#007bc1] ${errors.firstName ? "border-red-500" : "border-[#d9d9d9]"}`}
              />
              {errors.firstName && <p className="font-['Poppins',sans-serif] text-[11px] text-[#cc1903]">{errors.firstName}</p>}
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="font-['Poppins',sans-serif] font-normal text-[14px] text-[#002540] leading-none">Last Name</label>
              <input
                type="text"
                placeholder="Dela Cruz"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={`w-full h-[38px] bg-white border rounded-[10px] shadow-[0px_2px_6px_0px_rgba(0,0,0,0.25)] px-3 font-['Poppins',sans-serif] font-normal text-[14px] text-[#002540] placeholder:text-[#b5c5cf] outline-none focus:border-[#007bc1] ${errors.lastName ? "border-red-500" : "border-[#d9d9d9]"}`}
              />
              {errors.lastName && <p className="font-['Poppins',sans-serif] text-[11px] text-[#cc1903]">{errors.lastName}</p>}
            </div>
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1">
            <label className="font-['Poppins',sans-serif] font-normal text-[14px] text-[#002540] leading-none">
              {isCommercial ? "Business Address" : "Address"}
            </label>
            <input
              type="text"
              placeholder="123 Main St., Metro Manila"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={`w-full h-[38px] bg-white border rounded-[10px] shadow-[0px_2px_6px_0px_rgba(0,0,0,0.25)] px-3 font-['Poppins',sans-serif] font-normal text-[14px] text-[#002540] placeholder:text-[#b5c5cf] outline-none focus:border-[#007bc1] ${errors.address ? "border-red-500" : "border-[#d9d9d9]"}`}
            />
            {errors.address && <p className="font-['Poppins',sans-serif] text-[11px] text-[#cc1903]">{errors.address}</p>}
          </div>

          {/* Email or Phone */}
          <div className="flex flex-col gap-1">
            <label className="font-['Poppins',sans-serif] font-normal text-[14px] text-[#002540] leading-none">
              {isPhone ? (isCommercial ? "Business Phone Number" : "Phone Number") : "Email Address"}
            </label>
            <input
              type={isPhone ? "tel" : "email"}
              placeholder={isPhone ? "09123456789" : "juandelacruz@email.com"}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className={`w-full h-[38px] bg-white border rounded-[10px] shadow-[0px_2px_6px_0px_rgba(0,0,0,0.25)] px-3 font-['Poppins',sans-serif] font-normal text-[14px] text-[#002540] placeholder:text-[#b5c5cf] outline-none focus:border-[#007bc1] ${errors.contact ? "border-red-500" : "border-[#d9d9d9]"}`}
            />
            {errors.contact && <p className="font-['Poppins',sans-serif] text-[11px] text-[#cc1903]">{errors.contact}</p>}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="font-['Poppins',sans-serif] font-normal text-[14px] text-[#002540] leading-none">Password</label>
            <SignupPasswordInput
              placeholder="••••••••••"
              value={password}
              onChange={setPassword}
              error={errors.password}
            />
            {errors.password && <p className="font-['Poppins',sans-serif] text-[11px] text-[#cc1903]">{errors.password}</p>}
          </div>

          {/* Next button — 352×35, centered */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleNext}
              className="w-[352px] h-[35px] bg-[#007bc1] hover:bg-[#006aad] rounded-[10px] font-['Poppins',sans-serif] font-semibold text-[14px] text-white"
            >
              Next
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

function SignupPasswordInput({
  placeholder,
  value,
  onChange,
  error,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-[38px] bg-white border rounded-[10px] shadow-[0px_2px_6px_0px_rgba(0,0,0,0.25)] px-3 pr-9 font-['Poppins',sans-serif] font-normal text-[14px] text-[#002540] placeholder:text-[#b5c5cf] outline-none focus:border-[#007bc1] ${error ? "border-red-500" : "border-[#d9d9d9]"}`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B979E]"
      >
        {show ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SCREEN: OTP Verification
───────────────────────────────────────────── */

function OtpScreen({
  nav,
  onNavigate,
}: {
  nav: NavState;
  onNavigate: (updates: Partial<NavState>) => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const isFilled = digits.every((d) => d !== "");

  const titleMap: Record<OtpVariant, string> = {
    email: "We've sent a code to your email!",
    phone: "We've sent a code to your phone number!",
    sms: "We've sent a code to your SMS!",
  };

  const descMap: Record<OtpVariant, string> = {
    email: "Enter the six digit code sent to your email.",
    phone: "Enter the six digit code sent to your phone.",
    sms: "Enter the six digit code sent to your SMS.",
  };

  const resendMap: Record<OtpVariant, string> = {
    email: "Didn't get the code? ",
    phone: "Didn't get the code? ",
    sms: "Didn't get the code? ",
  };

  const goBack = () => {
    const history = [...nav.history];
    const prev = (history.pop() || "login") as Screen;
    onNavigate({ screen: prev, history, });
  };

  const handleVerify = () => {
    if (!isFilled) return;
    onNavigate({ screen: "home", history: [], showGuide: true });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#eaf7ff] px-6 pt-10 pb-10 overflow-y-auto">
      {/* Back arrow */}
      <button type="button" onClick={goBack} className="text-[#044674] mb-8 self-start -ml-1">
        <ChevronLeft size={26} />
      </button>

      {/* Title */}
      <h1 className="font-['Poppins',sans-serif] font-bold text-3xl text-[#044674] text-center leading-tight mb-5">
        {titleMap[nav.otpVariant]}
      </h1>

      {/* Description — 14px */}
      <p
        className="font-['Open_Sans',sans-serif] font-normal text-[14px] text-[#989898] text-center leading-relaxed mt-14 mb-8"
        style={{ fontVariationSettings: '"wdth" 100' }}
      >
        {descMap[nav.otpVariant]}
      </p>

      {/* OTP boxes */}
      <div className="mb-8">
        <OtpInput value={digits} onChange={setDigits} />
      </div>

      {/* Resend — 11px */}
      <p className="text-center font-['Poppins',sans-serif] font-normal text-[11px] mb-auto">
        <span className="text-[#7d7f7e]">{resendMap[nav.otpVariant]}</span>
        <button type="button" className="text-[11px] text-[#2d7dee] underline">
          Resend code
        </button>
      </p>

      {/* Verify button — original position at bottom */}
      <div className="mt-10">
        <DarkButton label="Verify" onClick={handleVerify} disabled={!isFilled} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SCREEN: Forgot Password (step 1)
───────────────────────────────────────────── */

function ForgotPasswordScreen({
  nav,
  onNavigate,
}: {
  nav: NavState;
  onNavigate: (updates: Partial<NavState>) => void;
}) {
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");

  const goBack = () => {
    const history = [...nav.history];
    const prev = (history.pop() || "login") as Screen;
    onNavigate({ screen: prev, history });
  };

  const handleConfirm = () => {
    if (!contact.trim()) {
      setError("Email or phone is required");
      return;
    }
    setError("");
    onNavigate({ screen: "forgot-check", history: [...nav.history, "forgot"] });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#eaf7ff] px-6 pt-8 pb-10 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center mb-1">
        <button type="button" onClick={goBack} className="text-[#044674] -ml-1">
          <ChevronLeft size={26} />
        </button>
        <h1 className="font-['Poppins',sans-serif] font-normal text-xl text-[#044674] text-center flex-1">
          Forgot Password
        </h1>
      </div>

      <p className="font-['Poppins',sans-serif] font-normal text-[12px] text-[#7d7f7e] text-center mb-10">
        Please enter your email to reset your password.
      </p>

      {/* push field lower */}
      <div className="mt-6 flex flex-col gap-1">
        <label className="font-['Poppins',sans-serif] font-normal text-[14px] text-[#002540] leading-none">
          Email Address or Phone Number
        </label>
        <input
          type="text"
          placeholder="Email Address or Phone Number"
          value={contact}
          onChange={(e) => { setContact(e.target.value); setError(""); }}
          className={`w-full h-[38px] bg-[#eaf7ff] border rounded-[10px] px-3 font-['Poppins',sans-serif] font-normal text-[14px] text-[#002540] placeholder:text-[#b5c5cf] outline-none focus:border-[#007bc1] ${error ? "border-red-500" : "border-[#b5c5cf]"}`}
        />
        {error && (
          <p className="font-['Poppins',sans-serif] font-light text-[11px] text-[#cc1903]">{error}</p>
        )}
      </div>

      <div className="mt-8">
        <DarkButton label="Confirm" onClick={handleConfirm} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SCREEN: Forgot Password Check Email (step 2)
───────────────────────────────────────────── */

function ForgotCheckEmailScreen({
  nav,
  onNavigate,
}: {
  nav: NavState;
  onNavigate: (updates: Partial<NavState>) => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));

  const goBack = () => {
    const history = [...nav.history];
    const prev = (history.pop() || "forgot") as Screen;
    onNavigate({ screen: prev, history });
  };

  const handleConfirm = () => {
    onNavigate({ screen: "set-password", history: [...nav.history, "forgot-check"] });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#eaf7ff] px-6 pt-8 pb-10 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button type="button" onClick={goBack} className="text-[#044674] -ml-1">
          <ChevronLeft size={26} />
        </button>
        <h1 className="font-['Poppins',sans-serif] font-normal text-xl text-[#044674] text-center flex-1">
          Forgot Password
        </h1>
      </div>

      <p className="font-['Poppins',sans-serif] font-semibold text-[16px] text-[#002540] text-center mb-1">
        Check your email
      </p>
      <p className="font-['Poppins',sans-serif] font-normal text-[12px] text-[#7d7f7e] text-center mb-6">
        We sent a reset link to juandelacruz@email.com
      </p>

      {/* push OTP section lower */}
      <div className="mt-6">
        <p className="font-['Poppins',sans-serif] font-normal text-[12px] text-[#989898] text-center mb-4">
          Enter the six digit code sent to your email.
        </p>

        <OtpInput value={digits} onChange={setDigits} />
      </div>

      <div className="mt-8">
        <DarkButton label="Confirm" onClick={handleConfirm} />
      </div>

      {/* Resend — below the Confirm button */}
      <p className="text-center font-['Poppins',sans-serif] font-normal text-[11px] mt-3">
        <span className="text-[#7d7f7e]">{"Haven't got the email yet? "}</span>
        <button type="button" className="text-[11px] text-[#2d7dee] underline">
          Resend email
        </button>
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SCREEN: Set New Password (step 3)
───────────────────────────────────────────── */

function SetPasswordScreen({
  nav,
  onNavigate,
}: {
  nav: NavState;
  onNavigate: (updates: Partial<NavState>) => void;
}) {
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [errors, setErrors] = useState<{ newPass?: string; confirmPass?: string }>({});

  const goBack = () => {
    const history = [...nav.history];
    const prev = (history.pop() || "forgot-check") as Screen;
    onNavigate({ screen: prev, history });
  };

  const handleConfirm = () => {
    const e: typeof errors = {};
    if (!newPass.trim()) e.newPass = "New password is required";
    if (!confirmPass.trim()) e.confirmPass = "Please confirm your password";
    else if (confirmPass !== newPass) e.confirmPass = "*Password does not match";
    setErrors(e);
    if (Object.keys(e).length === 0) {
      onNavigate({ screen: "success", history: [...nav.history, "set-password"] });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#eaf7ff] px-6 pt-8 pb-10 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button type="button" onClick={goBack} className="text-[#044674] -ml-1">
          <ChevronLeft size={26} />
        </button>
        <h1 className="font-['Poppins',sans-serif] font-normal text-xl text-[#044674] text-center flex-1">
          Forgot Password
        </h1>
      </div>

      <p className="font-['Poppins',sans-serif] font-semibold text-[16px] text-[#002540] mb-1">
        Set a new password
      </p>
      <p className="font-['Poppins',sans-serif] font-normal text-[12px] text-[#7d7f7e] mb-6 leading-normal">
        Create a new password. Make sure it is different from the previous ones.
      </p>

      {/* push fields a little lower */}
      <div className="mt-4 flex flex-col gap-4">
        {/* New Password */}
        <div className="flex flex-col gap-1">
          <label className="font-['Poppins',sans-serif] font-normal text-[14px] text-[#002540] leading-none">
            New Password
          </label>
          <NewPasswordInput
            label=""
            placeholder="Enter new password"
            value={newPass}
            onChange={setNewPass}
            bgClass="bg-[#eaf7ff] border-[#b5c5cf]"
          />
          {errors.newPass && (
            <p className="font-['Poppins',sans-serif] font-light text-[11px] text-[#cc1903]">{errors.newPass}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1">
          <label className="font-['Poppins',sans-serif] font-normal text-[14px] text-[#002540] leading-none">
            Confirm Password
          </label>
          <NewPasswordInput
            label=""
            placeholder="Confirm new password"
            value={confirmPass}
            onChange={setConfirmPass}
            bgClass="bg-[#eaf7ff] border-[#b5c5cf]"
            error={errors.confirmPass}
          />
          {errors.confirmPass && (
            <p className="font-['Poppins',sans-serif] font-light text-[11px] text-[#cc1903]">{errors.confirmPass}</p>
          )}
        </div>
      </div>

      <div className="mt-8">
        <DarkButton label="Confirm" onClick={handleConfirm} />
      </div>
    </div>
  );
}

function NewPasswordInput({
  label,
  placeholder,
  value,
  onChange,
  bgClass,
  error,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  bgClass: string;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      {label && (
        <label className="font-['Poppins',sans-serif] font-normal text-[14px] text-[#002540] leading-none block mb-1">
          {label}
        </label>
      )}
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-[38px] border rounded-[10px] px-3 pr-10 font-['Poppins',sans-serif] font-normal text-[14px] text-[#002540] placeholder:text-[#b5c5cf] outline-none focus:border-[#007bc1] ${bgClass} ${error ? "border-red-500" : ""}`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B979E]"
      >
        {show ? <Eye size={18} /> : <EyeOff size={18} />}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SCREEN: Success
───────────────────────────────────────────── */

function SuccessScreen({
  onNavigate,
}: {
  onNavigate: (updates: Partial<NavState>) => void;
}) {
  return (
    <div className="flex-1 flex flex-col bg-[#eaf7ff] px-6 pt-8 pb-10 overflow-y-auto">
      <div className="flex-1" />

      {/* Thumbs-up icon */}
      <div className="flex justify-center mb-5">
        <div className="w-28 h-28">
          <svg
            fill="none"
            viewBox="0 0 89.5253 80"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <path d={svgPaths.p51b2e80} fill="#1DB418" />
            <path d={svgPaths.p9c7500} fill="#1DB418" />
          </svg>
        </div>
      </div>

      <h2 className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#002540] text-center mb-3">
        Successful!
      </h2>
      <p className="font-['Poppins',sans-serif] font-normal text-[13px] text-[#7d7f7e] text-center leading-relaxed mb-8">
        Congratulations! Your password has been changed. Click confirm to login.
      </p>

      <DarkButton
        label="Confirm"
        onClick={() => onNavigate({ screen: "login", history: [] })}
      />

      <div className="flex-1" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   SCREEN: Home
───────────────────────────────────────────── */

const quickOrderProducts = [
  { img: img27kg, size: "2.7 KG", desc: "Our most portable variant and ideal for outdoor use. Great for camping, travel, and small cooking tasks." },
  { img: img5kg, size: "5 KG", desc: "Lighter weight, lower priced alternative that's perfect for small families and budget-conscious households." },
  { img: img11kg, size: "11 KG", desc: "The standard size for the average Filipino home. Best value for daily cooking needs." },
  { img: img22kg, size: "22 KG", desc: "Typically used in bakeries and small-medium restaurants that require higher gas consumption." },
  { img: img50kg, size: "50 KG", desc: "Ideal for large restaurants, laundry business, and commercial establishments with heavy usage." },
];

const orderAgainItems = [
  { img: img11kg, size: "11 KG", date: "10-10-2025" },
  { img: img27kg, size: "2.7 KG", date: "10-20-2024" },
  { img: img11kg, size: "11 KG", date: "10-10-2025" },
];

function HomeScreen({
  nav,
  onNavigate,
}: {
  nav: NavState;
  onNavigate: (updates: Partial<NavState>) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [promoVisible, setPromoVisible] = useState(() => !localStorage.getItem("promoShown"));
  const closePromo = () => { localStorage.setItem("promoShown", "1"); setPromoVisible(false); };
  const [activeTab, setActiveTab] = useState<"home" | "rewards" | "orders" | "profile">(nav.activeTab ?? "home");
  const [appGuideStep, setAppGuideStep] = useState<number>(nav.showGuide ? 1 : 0);
  const [rewardsSubScreen, setRewardsSubScreen] = useState<"my" | "all" | "activeCodes">("my");
  const [redeemItem, setRedeemItem] = useState<{ name: string; shortName: string; pts: number; img: string } | null>(null);
  const [redeemSuccessCode, setRedeemSuccessCode] = useState<string | null>(null);
  const [viewCodeActive, setViewCodeActive] = useState(false);
  const [codeConfirmed, setCodeConfirmed] = useState(false);

  const REWARD_ITEMS = [
    { name: "Get Free Notebook and pen for 10 Points", shortName: "Free Notebook and Pen", pts: 10, img: imgRewardNotebook },
    { name: "Get Free Desk Calendar for 20 Points", shortName: "Get Your Free Desk Calendar", pts: 20, img: imgRewardCalendar },
    { name: "Get Free Umbrella for 30 Points", shortName: "Get Your Free Umbrella", pts: 30, img: imgRewardUmbrella },
    { name: "Get Free Mug for 40 Points", shortName: "Get Your Free Mug", pts: 40, img: imgRewardMug },
  ];

  const ACTIVE_CODE = { name: "Notebook and Pen", shortName: "Free Notebook and Pen", pts: 10, img: imgRewardNotebook, code: "SG-1234", validUntil: "10-10-2025" };

  const openRewards = (sub: "my" | "all" | "activeCodes") => {
    setRewardsSubScreen(sub);
    setActiveTab("rewards");
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative bg-white">

      {/* ── Header ── */}
      <div
        className="shrink-0 w-full px-6 pt-10 pb-10 flex items-center justify-between"
        style={{ background: "#007bc1" }}
      >
        <div>
          <p className="font-['Poppins',sans-serif] font-bold text-[24px] text-white leading-tight">
            Hello, <span style={{ color: "#81d1ff" }}>Juan</span>!
          </p>
          <p className="font-['Poppins',sans-serif] font-medium text-[12px] text-white mt-0.5">
            What can we do for you today?
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="text-white" onClick={() => setAppGuideStep(1)}>
            <HelpCircle size={24} />
          </button>
          <button type="button" className="text-white" onClick={() => setMenuOpen(true)}>
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto bg-white pb-[110px] [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none", borderRadius: "24px 24px 0 0", marginTop: "-24px", position: "relative", zIndex: 1, display: activeTab === "rewards" ? "none" : undefined }}>

        {/* Rewards Card */}
        <div className="mx-4 mt-4 relative" style={{ height: "158px" }}>
          {/* Card background */}
          <div
            className="absolute inset-0 rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
            style={{ background: "linear-gradient(180.61deg, #044674 4.13%, #0883da 98.65%)" }}
          />
          {/* Logo — mid-right inside card */}
          <img
            src={imgRewardsDecor}
            className="absolute object-contain pointer-events-none"
            alt=""
            style={{ right: "44px", top: "22px", height: "80px", width: "110px", zIndex: 2 }}
          />
          {/* Content */}
          <div className="relative z-10 px-4 pt-3 pb-3 flex flex-col h-full">
            <p className="font-['Poppins',sans-serif] font-medium text-[13px] text-white">
              Superkalan Gaz Points
            </p>
            <div className="flex-1 flex items-center">
              <p className="font-['Poppins',sans-serif] font-semibold text-[40px] text-white leading-none">
                163
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => openRewards("my")}
                className="font-['Poppins',sans-serif] text-[12px] text-white rounded-[5px] px-4 py-1 shrink-0"
                style={{ background: "rgba(70,161,225,0.2)" }}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => openRewards("all")}
                className="font-['Poppins',sans-serif] font-medium text-[12px] text-[#044674] rounded-[5px] py-1 flex-1 flex items-center justify-center gap-1"
                style={{ background: "#d7efff" }}
              >
                Claim Reward <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Active Orders */}
        <div className="mt-5 px-4">
          <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#007bc1] mb-3">
            Active Orders
          </p>
          <div className="bg-white border border-[#eaeaea] rounded-[10px] shadow-sm relative overflow-hidden">
            <div className="flex items-stretch">
              <div className="shrink-0 flex items-center justify-center" style={{ width: "110px", height: "130px", paddingLeft: "36px" }}>
                <img src={img11kg} className="h-[110px] w-[72px] object-contain" alt="11 KG" />
              </div>
              <div className="flex-1 flex flex-col justify-center items-center gap-1 py-3">
                <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#002540]">11 KG</p>
                <p className="font-['Poppins',sans-serif] font-medium text-[12px] text-[#7d7f7e]">Qty: 2</p>
                <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#007bc1]">₱ 1,000</p>
              </div>
            </div>
            <div className="h-[22px] flex items-center px-3" style={{ background: "#e5f2f9" }}>
              <p className="font-['Poppins',sans-serif] font-semibold text-[10px] text-[#044674]">View Order Details</p>
            </div>
          </div>
        </div>

        {/* Order Again */}
        <div className="mt-5">
          <div className="flex items-center justify-between px-4 mb-1">
            <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#007bc1]">Order again</p>
            <ChevronRight size={20} color="#007bc1" />
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 py-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
            {orderAgainItems.map((item, idx) => (
              <div
                key={idx}
                onClick={() => onNavigate({ screen: "order-process", history: [] })}
                className="bg-white border border-[#007bc1] rounded-[10px] shrink-0 relative overflow-hidden cursor-pointer"
                style={{ width: "172px", height: "101px" }}
              >
                <p className="absolute top-[6px] right-[8px] font-['Poppins',sans-serif] text-[6px] text-[#989898]">Order Date: {item.date}</p>
                <img src={item.img} className="absolute left-[16px] top-[14px] h-[78px] w-[56px] object-contain" alt={item.size} />
                <p className="absolute top-1/2 -translate-y-1/2 right-[20px] font-['Poppins',sans-serif] font-semibold text-[20px] text-[#044674]">{item.size}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Order */}
        <div className="mt-5 px-4">
          <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#007bc1] mb-1">Quick Order</p>
          {quickOrderProducts.map((product, idx) => (
            <div
              key={idx}
              onClick={() => onNavigate({ screen: "order-process", history: [] })}
              className="bg-white border-2 border-[#007bc1] rounded-[10px] shadow-sm flex items-center mt-3 overflow-hidden cursor-pointer"
              style={{ minHeight: "91px" }}
            >
              {/* Left: size label + image stacked */}
              <div className="flex flex-col items-center justify-between shrink-0 py-2 self-stretch" style={{ width: "110px", paddingLeft: "18px", paddingRight: "4px" }}>
                <p className="font-['Poppins',sans-serif] font-semibold text-[14px] text-[#044674] self-start">{product.size}</p>
                <img src={product.img} className="h-[68px] w-[56px] object-contain" alt={product.size} />
              </div>
              {/* Right: description */}
              <div className="flex-1 pr-3 py-3">
                <p className="font-['Poppins',sans-serif] font-light text-[9px] text-[#044674] leading-relaxed">{product.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Rewards Overlay ── */}
      {activeTab === "rewards" && (
        <div className="absolute inset-0 z-30 flex flex-col overflow-hidden" style={{ bottom: "103px" }}>
          {/* Shared blue header — same as home/orders */}
          <div className="shrink-0 w-full px-6 pt-10 pb-10 flex items-center justify-between" style={{ background: "#007bc1" }}>
            <div>
              <p className="font-['Poppins',sans-serif] font-bold text-[24px] text-white leading-tight">
                Hello, <span style={{ color: "#81d1ff" }}>Juan</span>!
              </p>
              <p className="font-['Poppins',sans-serif] font-medium text-[12px] text-white mt-0.5">
                What can we do for you today?
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" className="text-white" onClick={() => setAppGuideStep(1)}>
                <HelpCircle size={24} />
              </button>
              <button type="button" className="text-white" onClick={() => setMenuOpen(true)}>
                <Menu size={24} />
              </button>
            </div>
          </div>

          {/* White card — overlaps header, contains all sub-screens */}
          <div className="flex-1 overflow-hidden relative bg-white" style={{ borderRadius: "24px 24px 0 0", marginTop: "-24px", zIndex: 1 }}>

            {/* MyRewards sub-screen */}
            {rewardsSubScreen === "my" && (
              <div className="flex flex-col h-full overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
                {/* Title row */}
                <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                  <button type="button" onClick={() => setActiveTab("home")} className="text-[#044674]">
                    <ChevronLeft size={24} />
                  </button>
                  <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#002540]">My Rewards</p>
                </div>
                {/* Content */}
                <div className="flex-1 px-7 pb-6">
                  <p className="font-['Poppins',sans-serif] font-semibold text-[32px] text-[#007bc1] mt-2">163 points</p>
                  <p className="font-['Poppins',sans-serif] font-normal text-[13px] text-[#757575] mt-3 leading-relaxed">
                    Earn more points from ordering at Superkalan Gaz branches. Expect your points to reflect within 24 hours. Points expire 12 months after they were earned.
                  </p>
                  {/* Points History */}
                  <div className="flex items-center justify-between mt-5 mb-3">
                    <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#007bc1]">Points History</p>
                    <button type="button" onClick={() => setRewardsSubScreen("all")} className="font-['Poppins',sans-serif] text-[13px] text-[#007bc1] underline">View All</button>
                  </div>
                  {[
                    { type: "Earned", pts: "+10", date: "2025-01-02" },
                    { type: "Earned", pts: "+10", date: "2024-12-23" },
                    { type: "Used", pts: "-10", date: "2024-11-10" },
                    { type: "Earned", pts: "+10", date: "2024-10-15" },
                  ].map((row, i) => (
                    <div key={i}>
                      <div className="flex items-center py-3 gap-3">
                        <svg width="20" height="20" viewBox="0 0 17.32 15" fill="none" style={{ transform: row.type === "Used" ? "rotate(180deg)" : "none", flexShrink: 0 }}>
                          <path d="M8.66025 0L17.3205 15H0L8.66025 0Z" fill={row.type === "Used" ? "#CC1903" : "#4BAD40"} />
                        </svg>
                        <div className="flex-1">
                          <p className="font-['Poppins',sans-serif] text-[15px] text-[#757575]">{row.type}</p>
                          <p className="font-['Poppins',sans-serif] text-[10px] text-[#c7c7c7]">{row.date}</p>
                        </div>
                        <p className="font-['Poppins',sans-serif] font-semibold text-[15px] text-[#007bc1]">{row.pts}</p>
                      </div>
                      {i < 3 && <div className="border-t border-[#d9d9d9]" />}
                    </div>
                  ))}
                  <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#002540] mt-6 mb-3">Claim Your Reward!</p>
                  <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
                    {REWARD_ITEMS.map((item) => (
                      <button
                        key={item.pts}
                        type="button"
                        onClick={() => { setRewardsSubScreen("all"); setRedeemItem(item); }}
                        className="shrink-0 bg-white border border-[#d9d9d9] rounded-[10px] shadow-sm flex flex-col items-center p-3"
                        style={{ width: "146px" }}
                      >
                        <img src={item.img} className="object-contain mb-2" style={{ width: "85px", height: "85px" }} alt={item.name} />
                        <div className="border border-[#007bc1] rounded-[10px] px-3 py-0.5 mb-2">
                          <p className="font-['Poppins',sans-serif] font-medium text-[8px] text-[#002540]">{item.pts} pts</p>
                        </div>
                        <p className="font-['Poppins',sans-serif] font-semibold text-[8px] text-[#002540] text-center leading-tight">{item.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* AllRewards sub-screen */}
            {rewardsSubScreen === "all" && (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Title row */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => { setRewardsSubScreen("my"); setRedeemItem(null); setRedeemSuccessCode(null); }} className="text-[#044674]">
                      <ChevronLeft size={24} />
                    </button>
                    <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#002540]">All Rewards</p>
                  </div>
                  <p className="font-['Poppins',sans-serif] font-semibold text-[16px] text-[#002540]">163 pts</p>
                </div>
                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-6 pb-4 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
                  <p className="font-['Poppins',sans-serif] font-bold text-[24px] text-[#007bc1] mb-4">Redeem with your points</p>
                  <div className="grid grid-cols-2 gap-3">
                    {REWARD_ITEMS.map((item) => (
                      <button
                        key={item.pts}
                        type="button"
                        onClick={() => setRedeemItem(item)}
                        className="bg-white border border-[#d9d9d9] rounded-[10px] shadow-sm flex flex-col items-center p-3"
                      >
                        <img src={item.img} className="object-contain mb-2" style={{ width: "85px", height: "85px" }} alt={item.name} />
                        <div className="border border-[#007bc1] rounded-[10px] px-3 py-0.5 mb-2">
                          <p className="font-['Poppins',sans-serif] font-medium text-[8px] text-[#002540]">{item.pts} pts</p>
                        </div>
                        <p className="font-['Poppins',sans-serif] font-semibold text-[8px] text-[#002540] text-center leading-tight">{item.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Redeem popup */}
                {redeemItem && !redeemSuccessCode && (
                  <div className="absolute inset-0 z-10">
                    <div className="absolute inset-0 bg-black opacity-30" onClick={() => setRedeemItem(null)} />
                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-tl-[20px] rounded-tr-[20px] px-6 pt-6 pb-8 z-20">
                      <div className="flex items-start justify-between mb-3">
                        <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#044674] flex-1 leading-tight">{redeemItem.shortName}</p>
                        <button type="button" onClick={() => setRedeemItem(null)} className="text-[#757575] ml-3 mt-1">
                          <X size={16} />
                        </button>
                      </div>
                      <div className="border border-[#007bc1] rounded-[10px] px-3 py-1 self-start inline-block mb-5">
                        <p className="font-['Poppins',sans-serif] font-medium text-[10px] text-[#002540]">{redeemItem.pts} pts</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRedeemSuccessCode("SG-1234")}
                        className="w-full bg-[#007bc1] rounded-[10px] py-3 font-['Poppins',sans-serif] font-semibold text-[15px] text-white text-center"
                      >
                        REDEEM
                      </button>
                    </div>
                  </div>
                )}
                {/* Redeem Success popup */}
                {redeemSuccessCode && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black opacity-30" />
                    <div className="relative bg-white rounded-[10px] mx-4 px-6 py-8 z-20 flex flex-col items-center" style={{ width: "338px" }}>
                      <button type="button" onClick={() => { setRedeemItem(null); setRedeemSuccessCode(null); setRewardsSubScreen("activeCodes"); }} className="absolute top-3 right-3 text-[#7D7F7E]">
                        <X size={18} />
                      </button>
                      <div className="rounded-full flex items-center justify-center mb-4" style={{ width: "120px", height: "120px", background: "#1DB418" }}>
                        <svg width="60" height="44" viewBox="0 0 44 34" fill="none">
                          <path d="M2 18L14 30L42 2" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <p className="font-['Poppins',sans-serif] font-bold text-[20px] text-[#007bc1] mb-1">Reward Redeemed!</p>
                      <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#007bc1] mb-3">{redeemSuccessCode}</p>
                      <p className="font-['Poppins',sans-serif] font-semibold text-[10px] text-[#007bc1] text-center">
                        To claim your reward, please show this code in any Superkalan Gaz Branches near you.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ActiveCodes sub-screen */}
            {rewardsSubScreen === "activeCodes" && (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Title row */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => { setRewardsSubScreen("all"); setViewCodeActive(false); setCodeConfirmed(false); }} className="text-[#044674]">
                      <ChevronLeft size={24} />
                    </button>
                    <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#002540]">All Rewards</p>
                  </div>
                  <p className="font-['Poppins',sans-serif] font-semibold text-[16px] text-[#002540]">163 pts</p>
                </div>
                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-6 pb-4 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
                  <p className="font-['Poppins',sans-serif] font-bold text-[24px] text-[#007bc1] mb-4">Redeem with your points</p>
                  <div className="grid grid-cols-2 gap-3">
                    {REWARD_ITEMS.map((item) => (
                      <div
                        key={item.pts}
                        className="bg-white border border-[#d9d9d9] rounded-[10px] shadow-sm flex flex-col items-center p-3"
                        style={{ opacity: item.pts === 10 ? 0.3 : 1 }}
                      >
                        <img src={item.img} className="object-contain mb-2" style={{ width: "85px", height: "85px" }} alt={item.name} />
                        <div className="border border-[#007bc1] rounded-[10px] px-3 py-0.5 mb-2">
                          <p className="font-['Poppins',sans-serif] font-medium text-[8px] text-[#002540]">{item.pts} pts</p>
                        </div>
                        <p className="font-['Poppins',sans-serif] font-semibold text-[8px] text-[#002540] text-center leading-tight">{item.name}</p>
                      </div>
                    ))}
                  </div>
                  <p className="font-['Poppins',sans-serif] font-bold text-[24px] text-[#007bc1] mt-6 mb-3">My Active Codes</p>
                  <button
                    type="button"
                    onClick={() => !codeConfirmed && setViewCodeActive(true)}
                    className="bg-white border border-[#d9d9d9] rounded-[10px] shadow-sm flex flex-col items-center p-3 w-[146px]"
                    style={{ opacity: codeConfirmed ? 0.3 : 1 }}
                  >
                    <img src={ACTIVE_CODE.img} className="object-contain mb-2" style={{ width: "85px", height: "85px" }} alt={ACTIVE_CODE.name} />
                    <div className="border border-[#007bc1] rounded-[10px] px-3 py-0.5 mb-2">
                      <p className="font-['Poppins',sans-serif] font-medium text-[8px] text-[#002540]">{ACTIVE_CODE.pts} pts</p>
                    </div>
                    <p className="font-['Poppins',sans-serif] font-semibold text-[8px] text-[#7d7f7e] text-center leading-tight">Valid until: {ACTIVE_CODE.validUntil}</p>
                  </button>
                </div>
                {/* ViewCode popup */}
                {viewCodeActive && (
                  <div className="absolute inset-0 z-10">
                    <div className="absolute inset-0 bg-black opacity-30" onClick={() => setViewCodeActive(false)} />
                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-tl-[20px] rounded-tr-[20px] px-6 pt-6 pb-8 z-20">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#044674]">{ACTIVE_CODE.shortName}</p>
                          <p className="font-['Poppins',sans-serif] font-semibold text-[32px] text-[#044674] mt-1">{ACTIVE_CODE.code}</p>
                        </div>
                        <button type="button" onClick={() => setViewCodeActive(false)} className="text-[#757575] mt-1">
                          <X size={16} />
                        </button>
                      </div>
                      <div className="border border-[#007bc1] rounded-[10px] px-3 py-1 inline-block mb-5">
                        <p className="font-['Poppins',sans-serif] font-medium text-[10px] text-[#002540]">{ACTIVE_CODE.pts} pts</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setViewCodeActive(false); setCodeConfirmed(true); }}
                        className="w-full bg-[#007bc1] rounded-[10px] py-3 font-['Poppins',sans-serif] font-semibold text-[15px] text-white text-center"
                      >
                        CONFIRM REDEMPTION
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom Navigation ── */}
      <div className="absolute bottom-3 left-3 right-3 z-50 rounded-[28px] overflow-visible" style={{ height: "100px" }}>
        {/* Notched SVG background */}
        <svg
          className="absolute bottom-0 left-0 w-full"
          style={{ height: "85px", borderRadius: "28px" }}
          viewBox="0 0 430 68.199"
          preserveAspectRatio="none"
          fill="none"
        >
          <path d={homeSvgPaths.p22bcfe80} fill="#BEE1F7" />
        </svg>

        {/* Nav items row — sits over the SVG */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around px-2 pb-3" style={{ height: "85px" }}>
          {/* Home */}
          <button type="button" onClick={() => setActiveTab("home")} className="flex flex-col items-center gap-[3px] pb-1 w-[70px]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d={homeSvgPaths.p37a1e000} fill={activeTab === "home" ? "#007bc1" : "#9DB2CE"} />
            </svg>
            <span className="font-['Poppins',sans-serif] text-[12px]" style={{ color: activeTab === "home" ? "#007bc1" : "#9DB2CE", fontWeight: activeTab === "home" ? 700 : 400 }}>Home</span>
          </button>

          {/* Rewards */}
          <button type="button" onClick={() => setActiveTab("rewards")} className="flex flex-col items-center gap-[3px] pb-1 w-[70px]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d={homeSvgPaths.p22c58184} stroke={activeTab === "rewards" ? "#007bc1" : "#9DB2CE"} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <span className="font-['Poppins',sans-serif] text-[12px]" style={{ color: activeTab === "rewards" ? "#007bc1" : "#9DB2CE" }}>Rewards</span>
          </button>

          {/* Center Order button — elevated above notch */}
          <div className="flex flex-col items-center shrink-0" style={{ marginBottom: "26px" }}>
            <button
              type="button"
              className="rounded-full flex items-center justify-center shadow-md"
              style={{ background: "#007bc1", width: "55px", height: "55px", border: "4px solid white" }}
            >
              <img src={imgOrderBag} className="object-cover" style={{ height: "34px", width: "24px" }} alt="Order" />
            </button>
          </div>

          {/* Orders */}
          <button type="button" onClick={() => onNavigate({ screen: "orders", history: [] })} className="flex flex-col items-center gap-[3px] pb-1 w-[70px]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M8.81 2L5.19 5.63" stroke={activeTab === "orders" ? "#007bc1" : "#9DB2CE"} strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" />
              <path d="M15.19 2L18.81 5.63" stroke={activeTab === "orders" ? "#007bc1" : "#9DB2CE"} strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" />
              <path d={homeSvgPaths.p298cd600} stroke={activeTab === "orders" ? "#007bc1" : "#9DB2CE"} strokeWidth="1.5" />
              <path d={homeSvgPaths.p3216aa00} stroke={activeTab === "orders" ? "#007bc1" : "#9DB2CE"} strokeLinecap="round" strokeWidth="1.5" />
            </svg>
            <span className="font-['Poppins',sans-serif] text-[12px]" style={{ color: activeTab === "orders" ? "#007bc1" : "#9DB2CE" }}>Orders</span>
          </button>

          {/* Profile */}
          <button type="button" onClick={() => onNavigate({ screen: "profile", history: [] })} className="flex flex-col items-center gap-[3px] pb-1 w-[70px]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d={homeSvgPaths.pae7b400} stroke="#9DB2CE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
              <path d={homeSvgPaths.p1b59ca60} stroke="#9DB2CE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            </svg>
            <span className="font-['Poppins',sans-serif] text-[12px]" style={{ color: "#9DB2CE" }}>Profile</span>
          </button>
        </div>
      </div>

      {/* ── Slide-out Menu ── */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setMenuOpen(false)} />
      )}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300"
        style={{ width: "200px", background: "#044674", transform: menuOpen ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Logo */}
        <div className="flex justify-end px-4 pt-8 pb-2">
          <img src={imgLogo} className="object-contain" style={{ height: "36px", width: "50px", filter: "brightness(0) invert(1)" }} alt="Superkalan Gaz" />
        </div>

        {/* Avatar + Name — right-aligned */}
        <div className="flex flex-col items-end px-5 pb-4 pt-6">
          <div className="rounded-full flex items-center justify-center mb-2" style={{ width: "48px", height: "48px", background: "#8f9297" }}>
            <User size={24} color="white" strokeWidth={1.5} />
          </div>
          <p className="font-['Poppins',sans-serif] font-semibold text-[14px] text-white">Juan Dela Cruz</p>
        </div>

        <div className="border-t w-full mb-2" style={{ borderColor: "#0F67A5" }} />

        {[
          { label: "Profile", icon: <User size={16} stroke="white" /> },
          { label: "My Orders", icon: <ShoppingBag size={16} stroke="white" /> },
          { label: "Settings", icon: <Settings size={16} stroke="white" /> },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            className="flex items-center justify-end gap-3 px-5 py-3 text-white font-['Poppins',sans-serif] font-normal text-[14px] hover:bg-white/10"
          >
            {item.label}
            {item.icon}
          </button>
        ))}

        <div className="border-t w-full my-2 mt-5" style={{ borderColor: "#0F67A5" }} />

        <button
          type="button"
          onClick={() => { setMenuOpen(false); setAppGuideStep(1); }}
          className="flex items-center justify-end px-5 py-3 text-white font-['Poppins',sans-serif] font-normal text-[14px] hover:bg-white/10"
        >
          App Guide
        </button>
        <button
          type="button"
          className="flex items-center justify-end px-5 py-3 text-white font-['Poppins',sans-serif] font-normal text-[14px] hover:bg-white/10"
        >
          Contact Us
        </button>
        <button
          type="button"
          onClick={() => { setMenuOpen(false); onNavigate({ screen: "faqs", history: [] }); }}
          className="flex items-center justify-end px-5 py-3 text-white font-['Poppins',sans-serif] font-normal text-[14px] hover:bg-white/10"
        >
          FAQs
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => { setMenuOpen(false); setLogoutConfirm(true); }}
          className="flex items-center gap-2 px-5 pb-8 text-white font-['Poppins',sans-serif] font-normal text-[14px] hover:bg-white/10"
        >
          Log Out
          <LogOut size={18} stroke="white" />
        </button>
      </div>

      {logoutConfirm && (
        <LogoutConfirmModal
          onConfirm={() => { setLogoutConfirm(false); onNavigate({ screen: "login", history: [] }); }}
          onCancel={() => setLogoutConfirm(false)}
        />
      )}

      {appGuideStep > 0 && (
        <AppGuideOverlay
          step={appGuideStep}
          onNext={() => {
            if (appGuideStep >= GUIDE_STEPS.length) { setAppGuideStep(0); onNavigate({ showGuide: false }); }
            else setAppGuideStep(appGuideStep + 1);
          }}
          onBack={() => setAppGuideStep(appGuideStep - 1)}
          onClose={() => { setAppGuideStep(0); onNavigate({ showGuide: false }); }}
        />
      )}

      {/* ── Promo Modal ── */}
      {promoVisible && appGuideStep === 0 && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.3)" }}>
          <div className="bg-white rounded-[10px] mx-4 p-4 flex flex-col gap-3" style={{ width: "338px" }}>
            <div className="flex items-center justify-between">
              <p className="font-['Poppins',sans-serif] font-bold text-[16px] text-[#007bc1]">
                First Time User Benefits!
              </p>
              <button type="button" onClick={closePromo} className="text-[#757575]">
                <X size={20} />
              </button>
            </div>
            <img src={imgPromo} className="w-full object-cover rounded" style={{ height: "123px" }} alt="Promo" />
            <p className="font-['Poppins',sans-serif] font-semibold text-[10px] text-[#007bc1] text-center">
              Get up to 10% discount on your first order!
            </p>
            <button
              type="button"
              onClick={closePromo}
              className="font-['Poppins',sans-serif] font-bold text-[12px] text-white rounded-[8px]"
              style={{ background: "#007bc1", height: "38px" }}
            >
              ORDER NOW
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Root App
───────────────────────────────────────────── */

// ─── Orders Screen ─────────────────────────────────────────────────────────────

type OrdersSubView = "list" | "details" | "feedback-rate" | "feedback-comment";

const ACTIVE_ORDERS = [
  { id: "12345", size: "11 KG", qty: 2, price: "₱ 1,000" },
];
const PAST_ORDERS = [
  { id: "12345", size: "11 KG", qty: 2, price: "₱ 1,000", date: "October 10, 2025", status: "COMPLETED" },
];

function OrdersBottomNav({
  onNavigate,
}: {
  onNavigate: (updates: Partial<NavState>) => void;
}) {
  return (
    <div className="absolute bottom-3 left-3 right-3 z-10 rounded-[28px] overflow-visible" style={{ height: "100px" }}>
      <svg className="absolute bottom-0 left-0 w-full" style={{ height: "85px", borderRadius: "28px" }} viewBox="0 0 430 68.199" preserveAspectRatio="none" fill="none">
        <path d={homeSvgPaths.p22bcfe80} fill="#BEE1F7" />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around px-2 pb-3" style={{ height: "85px" }}>
        {/* Home */}
        <button type="button" onClick={() => onNavigate({ screen: "home", history: [] })} className="flex flex-col items-center gap-[3px] pb-1 w-[70px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d={homeSvgPaths.p37a1e000} fill="#9DB2CE" />
          </svg>
          <span className="font-['Poppins',sans-serif] text-[12px]" style={{ color: "#9DB2CE" }}>Home</span>
        </button>
        {/* Rewards */}
        <button type="button" onClick={() => onNavigate({ screen: "home", history: [], activeTab: "rewards" })} className="flex flex-col items-center gap-[3px] pb-1 w-[70px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d={homeSvgPaths.p22c58184} stroke="#9DB2CE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
          <span className="font-['Poppins',sans-serif] text-[12px]" style={{ color: "#9DB2CE" }}>Rewards</span>
        </button>
        {/* Center */}
        <div className="flex flex-col items-center shrink-0" style={{ marginBottom: "26px" }}>
          <button type="button" className="rounded-full flex items-center justify-center shadow-md" style={{ background: "#007bc1", width: "55px", height: "55px", border: "4px solid white" }}>
            <img src={imgOrdersNavBag} className="object-cover" style={{ height: "34px", width: "24px" }} alt="Order" />
          </button>
        </div>
        {/* Orders — active */}
        <button type="button" className="flex flex-col items-center gap-[3px] pb-1 w-[70px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M8.81 2L5.19 5.63" stroke="#007bc1" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" />
            <path d="M15.19 2L18.81 5.63" stroke="#007bc1" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" />
            <path d={homeSvgPaths.p298cd600} stroke="#007bc1" strokeWidth="1.5" />
            <path d={homeSvgPaths.p3216aa00} stroke="#007bc1" strokeLinecap="round" strokeWidth="1.5" />
          </svg>
          <span className="font-['Poppins',sans-serif] font-bold text-[12px]" style={{ color: "#007bc1" }}>Orders</span>
        </button>
        {/* Profile */}
        <button type="button" onClick={() => onNavigate({ screen: "profile", history: [] })} className="flex flex-col items-center gap-[3px] pb-1 w-[70px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d={homeSvgPaths.pae7b400} stroke="#9DB2CE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            <path d={homeSvgPaths.p1b59ca60} stroke="#9DB2CE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          </svg>
          <span className="font-['Poppins',sans-serif] text-[12px]" style={{ color: "#9DB2CE" }}>Profile</span>
        </button>
      </div>
    </div>
  );
}

function ProfileBottomNav({
  onNavigate,
}: {
  onNavigate: (updates: Partial<NavState>) => void;
}) {
  return (
    <div className="absolute bottom-3 left-3 right-3 z-10 rounded-[28px] overflow-visible" style={{ height: "100px" }}>
      <svg className="absolute bottom-0 left-0 w-full" style={{ height: "85px", borderRadius: "28px" }} viewBox="0 0 430 68.199" preserveAspectRatio="none" fill="none">
        <path d={homeSvgPaths.p22bcfe80} fill="#BEE1F7" />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around px-2 pb-3" style={{ height: "85px" }}>
        {/* Home */}
        <button type="button" onClick={() => onNavigate({ screen: "home", history: [] })} className="flex flex-col items-center gap-[3px] pb-1 w-[70px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d={homeSvgPaths.p37a1e000} fill="#9DB2CE" />
          </svg>
          <span className="font-['Poppins',sans-serif] text-[12px]" style={{ color: "#9DB2CE" }}>Home</span>
        </button>
        {/* Rewards */}
        <button type="button" onClick={() => onNavigate({ screen: "home", history: [], activeTab: "rewards" })} className="flex flex-col items-center gap-[3px] pb-1 w-[70px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d={homeSvgPaths.p22c58184} stroke="#9DB2CE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
          <span className="font-['Poppins',sans-serif] text-[12px]" style={{ color: "#9DB2CE" }}>Rewards</span>
        </button>
        {/* Center bag */}
        <div className="flex flex-col items-center shrink-0" style={{ marginBottom: "26px" }}>
          <button type="button" onClick={() => onNavigate({ screen: "home", history: [] })} className="rounded-full flex items-center justify-center shadow-md" style={{ background: "#007bc1", width: "55px", height: "55px", border: "4px solid white" }}>
            <img src={imgOrdersNavBag} className="object-cover" style={{ height: "34px", width: "24px" }} alt="Order" />
          </button>
        </div>
        {/* Orders */}
        <button type="button" onClick={() => onNavigate({ screen: "orders", history: [] })} className="flex flex-col items-center gap-[3px] pb-1 w-[70px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M8.81 2L5.19 5.63" stroke="#9DB2CE" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" />
            <path d="M15.19 2L18.81 5.63" stroke="#9DB2CE" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" />
            <path d={homeSvgPaths.p298cd600} stroke="#9DB2CE" strokeWidth="1.5" />
            <path d={homeSvgPaths.p3216aa00} stroke="#9DB2CE" strokeLinecap="round" strokeWidth="1.5" />
          </svg>
          <span className="font-['Poppins',sans-serif] text-[12px]" style={{ color: "#9DB2CE" }}>Orders</span>
        </button>
        {/* Profile — active */}
        <button type="button" className="flex flex-col items-center gap-[3px] pb-1 w-[70px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d={homeSvgPaths.pae7b400} stroke="#007bc1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            <path d={homeSvgPaths.p1b59ca60} stroke="#007bc1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          </svg>
          <span className="font-['Poppins',sans-serif] font-bold text-[12px]" style={{ color: "#007bc1" }}>Profile</span>
        </button>
      </div>
    </div>
  );
}

function ProfileScreen({
  nav,
  onNavigate,
}: {
  nav: NavState;
  onNavigate: (updates: Partial<NavState>) => void;
}) {
  const [profileTab, setProfileTab] = useState<"personal" | "preferences">("personal");
  const [editMode, setEditMode] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [phoneNotif, setPhoneNotif] = useState(false);
  const [twoFA, setTwoFA] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [firstName, setFirstName] = useState("Juan");
  const [lastName, setLastName] = useState("Dela Cruz");
  const [email, setEmail] = useState("juandelacruz@email.com");
  const [contact, setContact] = useState("09123456789");
  const [address, setAddress] = useState("123 Main St., Metro Manila");

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative bg-white">
      {/* ── Header ── */}
      <div className="shrink-0 w-full px-6 pt-10 pb-10 flex items-center justify-between" style={{ background: "#007bc1" }}>
        <div>
          <p className="font-['Poppins',sans-serif] font-bold text-[24px] text-white leading-tight">
            Hello, <span style={{ color: "#81d1ff" }}>Juan</span>!
          </p>
          <p className="font-['Poppins',sans-serif] font-medium text-[12px] text-white mt-0.5">
            What can we do for you today?
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="text-white"><HelpCircle size={24} /></button>
          <button type="button" className="text-white" onClick={() => setMenuOpen(true)}><Menu size={24} /></button>
        </div>
      </div>

      {/* ── White Card ── */}
      <div
        className="flex-1 overflow-y-auto bg-white pb-[110px] [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", borderRadius: "24px 24px 0 0", marginTop: "-24px", position: "relative", zIndex: 1 }}
      >
        {/* Blue accent banner + avatar */}
        <div className="relative mx-4 rounded-[20px] mt-4 mb-2 flex flex-col items-center pt-4 pb-4" style={{ background: "#007bc1", minHeight: "100px" }}>
          {/* Avatar */}
          <div className="relative" style={{ marginTop: "8px" }}>
            <div className="flex items-center justify-center rounded-full" style={{ width: "90px", height: "90px", background: "#8f9297", border: "3px solid #e0e2e6" }}>
              <User size={40} color="white" />
            </div>
            {/* Camera badge */}
            <button type="button" className="absolute bottom-0 right-0 flex items-center justify-center rounded-full" style={{ width: "28px", height: "28px", background: "#007bc1", border: "2px solid white" }}>
              <Camera size={14} color="white" />
            </button>
          </div>
          <p className="font-['Poppins',sans-serif] font-bold text-[18px] text-white mt-2 leading-tight">Juan Dela Cruz</p>
          <p className="font-['Poppins',sans-serif] text-[10px] mt-0.5" style={{ color: "#9db2ce" }}>CUSTOMER ID: CUST-1234</p>
        </div>

        {/* Sub-tabs */}
        <div className="px-6 mt-4">
          <div className="flex relative">
            <button
              type="button"
              onClick={() => setProfileTab("personal")}
              className="flex-1 pb-2 font-['Poppins',sans-serif] font-semibold text-[11px] text-center"
              style={{ color: profileTab === "personal" ? "#007bc1" : "#989898" }}
            >
              Personal Details
            </button>
            <button
              type="button"
              onClick={() => setProfileTab("preferences")}
              className="flex-1 pb-2 font-['Poppins',sans-serif] font-semibold text-[11px] text-center"
              style={{ color: profileTab === "preferences" ? "#007bc1" : "#989898" }}
            >
              Account Preferences
            </button>
          </div>
          {/* Underlines */}
          <div className="relative h-[1px] bg-[#f1f1f1]">
            <div
              className="absolute top-0 h-[2px] transition-all duration-200"
              style={{
                background: "#007bc1",
                width: "50%",
                left: profileTab === "personal" ? "0%" : "50%",
              }}
            />
          </div>
        </div>

        {/* ── Personal Details ── */}
        {profileTab === "personal" && (
          <div className="px-6 mt-4">
            {/* Section header + EDIT */}
            <div className="flex items-center justify-between mb-4">
              <p className="font-['Poppins',sans-serif] font-bold text-[16px] text-[#007bc1]">Personal Details</p>
              <button
                type="button"
                onClick={() => setEditMode(!editMode)}
                className="flex items-center gap-1 px-3 py-1 rounded-[5px]"
                style={{ background: editMode ? "#d9d9d9" : "#007bc1" }}
              >
                <Pencil size={11} color={editMode ? "#989898" : "white"} />
                <span className="font-['Poppins',sans-serif] font-bold text-[10px]" style={{ color: editMode ? "#989898" : "white" }}>EDIT</span>
              </button>
            </div>

            {/* Form fields */}
            {[
              { label: "First Name", value: firstName, setter: setFirstName },
              { label: "Last Name", value: lastName, setter: setLastName },
              { label: "Email (If Applicable)", value: email, setter: setEmail },
              { label: "Contact Number", value: contact, setter: setContact },
              { label: "Address", value: address, setter: setAddress },
            ].map((field) => (
              <div key={field.label} className="mb-3">
                <p className="font-['Poppins',sans-serif] text-[10px] text-[#002540] mb-1">{field.label}</p>
                {editMode ? (
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => field.setter(e.target.value)}
                    className="w-full h-[38px] border border-[#989898] rounded-[10px] px-3 font-['Poppins',sans-serif] text-[14px] text-[#044674] outline-none"
                  />
                ) : (
                  <div className="w-full h-[38px] border border-[#989898] rounded-[10px] px-3 flex items-center">
                    <p className="font-['Poppins',sans-serif] text-[14px] text-[#989898]">{field.value}</p>
                  </div>
                )}
              </div>
            ))}

            {/* Password */}
            <div className="mb-1">
              <p className="font-['Poppins',sans-serif] text-[10px] text-[#002540] mb-1">Password</p>
              <div className="w-full h-[38px] border border-[#989898] rounded-[10px] px-3 flex items-center">
                <p className="font-['Poppins',sans-serif] text-[14px] text-[#989898]">••••••••••</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowResetPassword(true)}
              className="font-['Poppins',sans-serif] text-[10px] text-[#007bc1] mb-6"
            >
              Reset Password
            </button>
          </div>
        )}

        {/* ── Account Preferences ── */}
        {profileTab === "preferences" && (
          <div className="px-6 mt-4">
            <p className="font-['Poppins',sans-serif] font-bold text-[16px] text-[#007bc1] mb-4">Account Preferences</p>
            {[
              { label: "Email Notifications", value: emailNotif, setter: setEmailNotif },
              { label: "Phone Notifications", value: phoneNotif, setter: setPhoneNotif },
              { label: "2FA Security", value: twoFA, setter: setTwoFA },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-[12px] px-3 mb-2" style={{ background: "#f2f2f2", height: "48px" }}>
                <p className="font-['Poppins',sans-serif] font-semibold text-[12px] text-black">{item.label}</p>
                <button
                  type="button"
                  onClick={() => item.setter(!item.value)}
                  className="relative flex-shrink-0"
                  style={{ width: "40px", height: "24px" }}
                >
                  <div
                    className="absolute inset-0 rounded-full transition-colors duration-200"
                    style={{ background: item.value ? "#007bc1" : "white", border: item.value ? "none" : "1px solid #757575" }}
                  />
                  <div
                    className="absolute top-[2px] rounded-full transition-all duration-200"
                    style={{
                      width: "20px",
                      height: "20px",
                      background: item.value ? "#f5f5f5" : "#757575",
                      left: item.value ? "18px" : "2px",
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Reset Password Bottom Sheet ── */}
      {showResetPassword && (
        <div className="absolute inset-0 z-20">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setShowResetPassword(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-tl-[20px] rounded-tr-[20px] px-6 pt-6 pb-8 z-30">
            <div className="flex items-center justify-between mb-5">
              <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#044674]">Password reset</p>
              <button type="button" onClick={() => setShowResetPassword(false)} className="text-[#757575]">
                <X size={16} />
              </button>
            </div>
            {/* Current Password */}
            <p className="font-['Poppins',sans-serif] text-[10px] text-[#002540] mb-1">Current Password</p>
            <div className="relative mb-4">
              <input
                type={showCurrentPw ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full h-[38px] border border-[#989898] rounded-[10px] px-3 pr-10 font-['Poppins',sans-serif] text-[14px] text-[#044674] outline-none"
              />
              <button type="button" className="absolute right-3 top-[9px] text-[#7d7f7e]" onClick={() => setShowCurrentPw(!showCurrentPw)}>
                {showCurrentPw ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {/* New Password */}
            <p className="font-['Poppins',sans-serif] text-[10px] text-[#002540] mb-1">New Password</p>
            <div className="relative mb-6">
              <input
                type={showNewPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-[38px] border border-[#989898] rounded-[10px] px-3 pr-10 font-['Poppins',sans-serif] text-[14px] text-[#044674] outline-none"
              />
              <button type="button" className="absolute right-3 top-[9px] text-[#7d7f7e]" onClick={() => setShowNewPw(!showNewPw)}>
                {showNewPw ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowResetPassword(false)}
                className="flex-1 h-[38px] rounded-[8px] font-['Poppins',sans-serif] font-bold text-[12px] text-[#989898]"
                style={{ background: "#d9d9d9" }}
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => { setShowResetPassword(false); setCurrentPassword(""); setNewPassword(""); }}
                className="flex-1 h-[38px] rounded-[8px] font-['Poppins',sans-serif] font-bold text-[12px] text-white"
                style={{ background: "#007bc1" }}
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Nav ── */}
      <ProfileBottomNav onNavigate={onNavigate} />

      {/* ── Slide-out Menu ── */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setMenuOpen(false)} />
      )}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300"
        style={{ width: "200px", background: "#044674", transform: menuOpen ? "translateX(0)" : "translateX(100%)" }}
      >
        <div className="flex justify-end px-4 pt-8 pb-2">
          <img src={imgLogo} className="object-contain" style={{ height: "36px", width: "50px", filter: "brightness(0) invert(1)" }} alt="Superkalan Gaz" />
        </div>
        <nav className="flex-1 px-4 pt-2">
          {[
            { label: "Home", icon: <ShoppingBag size={18} />, action: () => { setMenuOpen(false); onNavigate({ screen: "home", history: [] }); } },
            { label: "My Orders", icon: <Settings size={18} />, action: () => { setMenuOpen(false); onNavigate({ screen: "orders", history: [] }); } },
            { label: "FAQs", icon: <BookOpen size={18} />, action: () => { setMenuOpen(false); onNavigate({ screen: "faqs", history: [] }); } },
            { label: "Contact Us", icon: <Phone size={18} />, action: () => { setMenuOpen(false); } },
          ].map((item) => (
            <button key={item.label} type="button" onClick={item.action} className="flex items-center gap-3 w-full py-3 text-white border-b border-white/10">
              {item.icon}
              <span className="font-['Poppins',sans-serif] text-[14px]">{item.label}</span>
            </button>
          ))}
        </nav>
        <button type="button" onClick={() => { setMenuOpen(false); onNavigate({ screen: "login", history: [] }); }} className="flex items-center gap-3 px-4 py-4 text-white border-t border-white/20">
          <LogOut size={18} />
          <span className="font-['Poppins',sans-serif] text-[14px]">Logout</span>
        </button>
      </div>
    </div>
  );
}

function OrdersScreen({
  nav,
  onNavigate,
}: {
  nav: NavState;
  onNavigate: (updates: Partial<NavState>) => void;
}) {
  const [ordersTab, setOrdersTab] = useState<"active" | "past">("active");
  const [subView, setSubView] = useState<OrdersSubView>("list");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [starRating, setStarRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const handleViewDetails = (id: string) => {
    setSelectedOrderId(id);
    setSubView("details");
  };

  const handleRateOrder = (id: string) => {
    setSelectedOrderId(id);
    setStarRating(0);
    setFeedbackComment("");
    setSubView("feedback-rate");
  };

  const handleSubmitFeedback = () => {
    console.log("Feedback submitted:", { orderId: selectedOrderId, starRating, feedbackComment });
    setSubView("list");
    setOrdersTab("past");
  };

  const renderOrderCard = (order: typeof ACTIVE_ORDERS[0], isPast: boolean) => (
    <div key={order.id} className="mx-4 mb-4 rounded-[10px] border border-[#eaeaea] bg-white shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] overflow-hidden relative">
      {isPast && (
        <div className="absolute top-[10px] right-[10px] rounded-[10px] flex items-center justify-center z-10" style={{ background: "#1db418", height: "17px", width: "67px" }}>
          <span className="font-['Poppins',sans-serif] font-medium text-[8px] text-[#c2dfbe]">COMPLETED</span>
        </div>
      )}
      <div className="flex items-stretch" style={{ minHeight: "130px" }}>
        <div className="shrink-0 flex items-center justify-center" style={{ width: "110px", paddingLeft: "36px" }}>
          <img src={imgOrdersCylinder} className="h-[110px] w-[72px] object-contain" alt={order.size} />
        </div>
        <div className="flex-1 flex flex-col justify-center gap-1 py-3 pr-3">
          <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#002540] leading-tight">{order.size}</p>
          <p className="font-['Poppins',sans-serif] font-medium text-[12px] text-[#7d7f7e]">Qty: {order.qty}</p>
          <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#007bc1]">{order.price}</p>
        </div>
      </div>
      <div className="flex items-center justify-between px-3" style={{ background: "#e5f2f9", height: isPast ? "50px" : "30px" }}>
        <div>
          <button
            type="button"
            onClick={() => handleViewDetails(order.id)}
            className="font-['Poppins',sans-serif] font-semibold text-[12px] text-[#044674] block"
          >
            View Order Details
          </button>
          {isPast && (order as any).date && (
            <p className="font-['Poppins',sans-serif] font-medium text-[10px] text-[#7d7f7e]">
              Order Date: {(order as any).date}
            </p>
          )}
        </div>
        {isPast && (
          <button
            type="button"
            onClick={() => handleRateOrder(order.id)}
            className="font-['Poppins',sans-serif] font-medium text-[11px] text-white rounded-[10px] px-3 py-1"
            style={{ background: "#007bc1" }}
          >
            Rate this order
          </button>
        )}
      </div>
    </div>
  );

  const renderListContent = () => {
    const orders = ordersTab === "active" ? ACTIVE_ORDERS : PAST_ORDERS;
    const isPast = ordersTab === "past";
    return (
      <>
        {/* Title */}
        <div className="px-6 pt-5 pb-4">
          <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#002540]">My Orders</p>
        </div>
        {/* Tabs */}
        <div className="relative px-6">
          <div className="flex">
            <button
              type="button"
              onClick={() => setOrdersTab("active")}
              className="flex-1 pb-2 font-['Poppins',sans-serif] font-semibold text-[13px]"
              style={{ color: ordersTab === "active" ? "#007bc1" : "#989898" }}
            >
              {ordersTab === "active" ? `Active Orders (${ACTIVE_ORDERS.length})` : "Active Orders"}
            </button>
            <button
              type="button"
              onClick={() => setOrdersTab("past")}
              className="flex-1 pb-2 font-['Poppins',sans-serif] font-semibold text-[13px]"
              style={{ color: ordersTab === "past" ? "#007bc1" : "#989898" }}
            >
              Past Orders
            </button>
          </div>
          {/* Full divider */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-[#f1f1f1]" />
          {/* Active tab underline */}
          <div
            className="absolute bottom-0 h-px bg-[#007bc1] transition-all duration-200"
            style={{ left: ordersTab === "active" ? "0%" : "50%", width: "50%" }}
          />
        </div>
        {/* Content */}
        <div className="pt-4">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 mx-4">
              <div className="rounded-[10px] flex items-center justify-center mb-4" style={{ background: "rgba(0,123,193,0.10)", width: "250px", height: "193px" }}>
                <img src={imgOrdersLogo} className="object-contain" style={{ width: "160px", height: "120px" }} alt="No orders" />
              </div>
              <p className="font-['Poppins',sans-serif] text-[13px] text-[#989898] text-center">
                You have no active orders.
              </p>
            </div>
          ) : (
            orders.map((o) => renderOrderCard(o, isPast))
          )}
        </div>
      </>
    );
  };

  const renderDetailsContent = () => (
    <>
      {/* Back + Title */}
      <div className="flex items-center px-4 pt-5 pb-4 gap-2">
        <button type="button" onClick={() => setSubView("list")} className="text-[#044674]">
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        <p className="font-['Poppins',sans-serif] font-bold text-[22px] text-[#002540]">Order Details</p>
      </div>

      {/* ORDER# badge */}
      <div className="px-5 mb-1">
        <div className="inline-flex items-center rounded-[10px] px-4 py-1.5 mb-2" style={{ background: "rgba(0,123,193,0.15)" }}>
          <p className="font-['Poppins',sans-serif] font-medium text-[14px] text-[#007bc1]">ORDER# 12345</p>
        </div>
        <button type="button" className="block font-['Poppins',sans-serif] text-[12px] text-[#989898] underline mb-1">
          Get help with this order
        </button>
        <p className="font-['Poppins',sans-serif] text-[12px] text-[#7d7f7e]">
          Order Date: 10 October 2025, 10:00 AM
        </p>
      </div>

      {/* Location section */}
      <div className="pr-5 pl-14 mt-5 mb-4">
        {/* Pickup row */}
        <div className="flex items-start gap-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5">
            <path d={ordersSvgPaths.p27c543b0} stroke="#007BC1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <path d={ordersSvgPaths.p2d59bff0} stroke="#007BC1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
          <div>
            <p className="font-['Poppins',sans-serif] font-medium text-[13px] text-[#7d7f7e]">Ordered From</p>
            <p className="font-['Poppins',sans-serif] font-semibold text-[14px] text-[#002540]">Superkalan Gaz - Manila Branch</p>
          </div>
        </div>

        {/* Dots centered under 28px icon: icon center = 14px from content-area left */}
        <div className="flex flex-col gap-[10px]" style={{ paddingLeft: "13px", paddingTop: "4px", paddingBottom: "4px" }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{ width: "2px", height: "2px", borderRadius: "50%", background: "#aaa" }} />
          ))}
        </div>

        {/* Delivery row */}
        <div className="flex items-start gap-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5">
            <path d={ordersSvgPaths.p27c543b0} stroke="#CFCFCF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <path d={ordersSvgPaths.p2d59bff0} stroke="#CFCFCF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
          <div>
            <p className="font-['Poppins',sans-serif] font-medium text-[13px] text-[#7d7f7e]">Delivery Address</p>
            <p className="font-['Poppins',sans-serif] font-semibold text-[14px] text-[#002540]">123 Main St, Metro Manila</p>
          </div>
        </div>
      </div>

      {/* Payment row */}
      <div className="flex items-center gap-4 px-5 mb-5">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <path d={ordersSvgPaths.p4f70d00} stroke="#007BC1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
        <p className="font-['Poppins',sans-serif] font-medium text-[14px] text-[#002540]">Cash On Delivery</p>
      </div>

      {/* Product card */}
      <div className="mx-4 rounded-[12px] border border-[#eaeaea] bg-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="flex items-center" style={{ minHeight: "140px" }}>
          <div className="shrink-0 flex items-center justify-center" style={{ width: "130px" }}>
            <img src={imgOrdersCylinder} className="h-[120px] w-[82px] object-contain" alt="11 KG" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-1 py-4 pr-4">
            <p className="font-['Poppins',sans-serif] font-bold text-[22px] text-[#002540]">11 KG</p>
            <p className="font-['Poppins',sans-serif] font-medium text-[13px] text-[#7d7f7e]">Qty: 2</p>
            <p className="font-['Poppins',sans-serif] font-bold text-[22px] text-[#007bc1] mt-1">₱ 1,000</p>
          </div>
        </div>
      </div>
    </>
  );

  const renderFeedbackSheet = () => {
    const isComment = subView === "feedback-comment";
    return (
      <>
        {/* Dark overlay — above nav */}
        <div className="absolute inset-0 z-20" style={{ background: "rgba(0,0,0,0.30)" }} />
        {/* Sheet */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-white rounded-t-[20px] px-5 pt-5 pb-6" style={{ minHeight: "420px" }}>
          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-4">
            {isComment ? (
              <>
                <div className="rounded-full bg-[#989898]" style={{ width: "8px", height: "8px" }} />
                <div className="rounded bg-[#989898]" style={{ width: "40px", height: "8px" }} />
              </>
            ) : (
              <>
                <div className="rounded bg-[#989898]" style={{ width: "40px", height: "8px" }} />
                <div className="rounded-full bg-[#989898]" style={{ width: "8px", height: "8px" }} />
              </>
            )}
          </div>

          {/* Avatar (feedback-rate only) */}
          {!isComment && (
            <div className="flex justify-center mb-3">
              <div className="rounded-full flex items-center justify-center" style={{ background: "#8f9297", width: "80px", height: "80px", border: "1px solid #e0e2e6" }}>
                <svg width="42" height="42" viewBox="0 0 34.4065 41.6" fill="none">
                  <path d={ordersSvgPaths.p16947b00} fill="white" />
                  <path d={ordersSvgPaths.p2b5a3a00} fill="white" />
                </svg>
              </div>
            </div>
          )}

          <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#044674] mb-1">
            How was your experience?
          </p>
          <p className="font-['Poppins',sans-serif] text-[16px] text-[#7d7f7e] mb-4">
            {isComment
              ? "Help us improve your delivery experience by rating our branch."
              : "Help us improve your delivery experience by rating your rider."}
          </p>

          {/* Stars */}
          <div className="flex gap-3 mb-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStarRating(n)}
                className="shrink-0"
                style={{ width: "52px", height: "52px" }}
              >
                <svg width="52" height="52" viewBox="0 0 50 47.5" fill="none">
                  <path
                    d={ordersSvgPaths.p273e7980}
                    fill={n <= starRating ? "#007bc1" : "#D9D9D9"}
                  />
                </svg>
              </button>
            ))}
          </div>

          {/* Comment textarea (feedback-comment only) */}
          {isComment && (
            <textarea
              className="w-full border border-[#d9d9d9] rounded-[5px] p-3 font-['Poppins',sans-serif] text-[16px] text-[#444] resize-none mb-4"
              style={{ height: "100px" }}
              placeholder="Write your thoughts..."
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
            />
          )}

          {/* Button */}
          {isComment ? (
            <button
              type="button"
              onClick={handleSubmitFeedback}
              className="w-full h-[47px] rounded-[10px] font-['Poppins',sans-serif] font-semibold text-[15px] text-white"
              style={{ background: "#007bc1" }}
            >
              Submit Feedback
            </button>
          ) : (
            <button
              type="button"
              onClick={() => starRating > 0 && setSubView("feedback-comment")}
              className="w-full h-[47px] rounded-[10px] font-['Poppins',sans-serif] font-semibold text-[15px] text-white"
              style={{ background: starRating > 0 ? "#007bc1" : "#b0cfe0", cursor: starRating > 0 ? "pointer" : "not-allowed" }}
            >
              Next
            </button>
          )}
        </div>
      </>
    );
  };

  const showFeedback = subView === "feedback-rate" || subView === "feedback-comment";

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative bg-white">
      {/* ── Header ── */}
      <div
        className="shrink-0 w-full px-6 pt-10 pb-10 flex items-center justify-between"
        style={{ background: "#007bc1" }}
      >
        <div>
          <p className="font-['Poppins',sans-serif] font-bold text-[24px] text-white leading-tight">
            Hello, <span style={{ color: "#81d1ff" }}>Juan</span>!
          </p>
          <p className="font-['Poppins',sans-serif] font-medium text-[12px] text-white mt-0.5">
            What can we do for you today?
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="text-white"><HelpCircle size={24} /></button>
          <button type="button" className="text-white" onClick={() => setMenuOpen(true)}><Menu size={24} /></button>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div
        className="flex-1 overflow-y-auto bg-white pb-[110px] [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", borderRadius: "24px 24px 0 0", marginTop: "-24px", position: "relative", zIndex: 1 }}
      >
        {subView === "list" && renderListContent()}
        {subView === "details" && renderDetailsContent()}
        {showFeedback && (
          <>
            {ordersTab === "past" ? renderListContent() : renderDetailsContent()}
          </>
        )}
      </div>

      {/* ── Feedback Overlay ── */}
      {showFeedback && renderFeedbackSheet()}

      {/* ── Bottom Nav ── */}
      <OrdersBottomNav onNavigate={onNavigate} />

      {/* ── Slide-out Menu ── */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setMenuOpen(false)} />
      )}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300"
        style={{ width: "200px", background: "#044674", transform: menuOpen ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Logo */}
        <div className="flex justify-end px-4 pt-6 pb-3">
          <img src={imgLogo} className="object-contain" style={{ height: "36px", width: "50px" }} alt="Superkalan Gaz" />
        </div>

        {/* Avatar + Name */}
        <div className="flex flex-col items-center px-6 pb-4">
          <div className="rounded-full flex items-center justify-center mb-2" style={{ width: "56px", height: "56px", background: "#8f9297" }}>
            <User size={28} color="white" />
          </div>
          <p className="font-['Poppins',sans-serif] font-semibold text-[13px] text-white text-center">Juan Dela Cruz</p>
        </div>

        <div className="border-t border-white/20 mx-4 mb-2" />

        {[
          { label: "Profile", icon: <User size={18} /> },
          { label: "My Orders", icon: <ShoppingBag size={18} /> },
          { label: "Settings", icon: <Settings size={18} /> },
        ].map((item) => (
          <button key={item.label} type="button" className="flex items-center justify-end gap-3 px-5 py-3 text-white font-['Poppins',sans-serif] text-[14px] hover:bg-white/10">
            {item.label}
            <span className="text-white/80">{item.icon}</span>
          </button>
        ))}

        <div className="border-t border-white/20 mx-4 my-2" />

        <button type="button" onClick={() => { setMenuOpen(false); onNavigate({ screen: "home", showGuide: true, history: [] }); }} className="flex items-center justify-end px-5 py-3 text-white font-['Poppins',sans-serif] text-[14px] hover:bg-white/10">
          App Guide
        </button>
        <button type="button" className="flex items-center justify-end px-5 py-3 text-white font-['Poppins',sans-serif] text-[14px] hover:bg-white/10">
          Contact Us
        </button>
        <button type="button" onClick={() => { setMenuOpen(false); onNavigate({ screen: "faqs", history: [] }); }} className="flex items-center justify-end px-5 py-3 text-white font-['Poppins',sans-serif] text-[14px] hover:bg-white/10">
          FAQs
        </button>

        <div className="flex-1" />
        <div className="border-t border-white/20 mx-4 mb-3" />
        <button
          type="button"
          onClick={() => { setMenuOpen(false); setLogoutConfirm(true); }}
          className="flex items-center gap-2 px-5 pb-8 text-white font-['Poppins',sans-serif] font-normal text-[14px] hover:bg-white/10"
        >
          Log Out
          <LogOut size={18} stroke="white" />
        </button>
      </div>

      {logoutConfirm && (
        <LogoutConfirmModal
          onConfirm={() => { setLogoutConfirm(false); onNavigate({ screen: "login", history: [] }); }}
          onCancel={() => setLogoutConfirm(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OrderProcess Screen
// ─────────────────────────────────────────────────────────────────────────────

type OPStep = "select" | "summary" | "track" | "delivered";
type OPModal = "none" | "selectAddress" | "editAddress" | "confirmed" | "schedPicker" | "paymentMethod";

const PRODUCTS = [
  { id: "2.7kg", label: "2.7 KG", price: 350, deliveryTime: "12:00 - 12:05 PM", img: img27kg, desc: "Our most portable variant and ideal for outdoor use, serving the Filipino consumer for over 30 years. The most affordable, easy to use product for those shifting to our clean burning LPG cooking gas." },
  { id: "5kg", label: "5 KG", price: 620, deliveryTime: "12:00 - 12:10 PM", img: img5kg, desc: "Lighter weight, lower priced alternative to our 11kg variant for smaller families." },
  { id: "11kg", label: "11 KG", price: 1000, deliveryTime: "12:00 - 12:05 PM", img: img11kg, desc: "The standard size for the average Filipino home." },
  { id: "22kg", label: "22 KG", price: 1800, deliveryTime: "12:15 - 12:30 PM", img: img22kg, desc: "Typically used in bakeries and small-medium restaurants/food outlets." },
  { id: "50kg", label: "50 KG", price: 3500, deliveryTime: "12:30 - 1:00 PM", img: img50kg, desc: "Ideal for large restaurants, laundry business, poultry farms, hotels, factories and other commercial establishments." },
];

const ADDRESSES = [
  { id: "house1", label: "House 1", address: "123 Main St, Metro Manila" },
  { id: "office", label: "Office", address: "246 Main Road, Salcedo Makati" },
  { id: "house2", label: "House 2", address: "810 Main Alley, Las Pinas" },
];

const TRACK_STEPS = ["Order Placed", "Preparing", "On the Way", "Delivered"];

function OPBottomNav({ onNavigate }: { onNavigate: (u: Partial<NavState>) => void }) {
  return (
    <div className="absolute bottom-3 left-3 right-3 z-50 rounded-[28px] overflow-visible" style={{ height: "100px" }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 390 100" preserveAspectRatio="none" fill="none">
        <path d={homeSvgPaths.p22bcfe80} fill="#007bc1" />
      </svg>
      <div className="absolute inset-0 flex items-end pb-4 px-6">
        <button type="button" onClick={() => onNavigate({ screen: "home", history: [] })} className="flex-1 flex flex-col items-center gap-0.5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d={homeSvgPaths.p6adaa280} stroke="white" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-['Poppins',sans-serif] text-[9px] text-white/60">Home</span>
        </button>
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d={homeSvgPaths.p6adaa280} stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-['Poppins',sans-serif] text-[9px] text-white font-semibold">Orders</span>
        </div>
        <button type="button" onClick={() => onNavigate({ screen: "home", history: [] })} className="flex-1 flex flex-col items-center gap-0.5">
          <img src={imgOrderBag} className="w-[22px] h-[22px] object-contain opacity-60" alt="shop" />
          <span className="font-['Poppins',sans-serif] text-[9px] text-white/60">Shop</span>
        </button>
        <button type="button" className="flex-1 flex flex-col items-center gap-0.5">
          <User size={20} color="rgba(255,255,255,0.6)" />
          <span className="font-['Poppins',sans-serif] text-[9px] text-white/60">Profile</span>
        </button>
      </div>
    </div>
  );
}

function OrderProcessScreen({
  nav,
  onNavigate,
}: {
  nav: NavState;
  onNavigate: (updates: Partial<NavState>) => void;
}) {
  const [step, setStep] = useState<OPStep>("select");
  const [modal, setModal] = useState<OPModal>("none");
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[2]);
  const [qty, setQty] = useState(1);
  const [selectedAddress, setSelectedAddress] = useState(ADDRESSES[0]);
  const [editAddrLabel, setEditAddrLabel] = useState("");
  const [editAddrAddress, setEditAddrAddress] = useState("");
  const [editAddrContact, setEditAddrContact] = useState("");
  const [editAddrNote, setEditAddrNote] = useState("");
  const [editAddrPrimary, setEditAddrPrimary] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [trackDelivered, setTrackDelivered] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [schedPickerTab, setSchedPickerTab] = useState<"date" | "time">("date");
  const [schedHour, setSchedHour] = useState("10");
  const [schedMinute, setSchedMinute] = useState("00");
  const [schedAmPm, setSchedAmPm] = useState<"AM" | "PM">("AM");
  const [schedConfirmedLabel, setSchedConfirmedLabel] = useState("");
  const [schedSelDay, setSchedSelDay] = useState(1);
  const [feedbackStep, setFeedbackStep] = useState<"none" | "rider" | "store" | "xfeedback">("none");
  const [riderRating, setRiderRating] = useState(0);
  const [storeRating, setStoreRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<"gcash" | "maya" | "cash">("gcash");
  const [tempPayment, setTempPayment] = useState<"gcash" | "maya" | "cash">("gcash");
  const [toastMsg, setToastMsg] = useState("");
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const showToastMsg = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2500);
  };

  const totalCost = selectedProduct.price * qty;

  const handleSaveAddress = () => {
    setModal("none");
    showToastMsg("All changes are saved!");
  };

  const headerTitle =
    step === "track" || step === "delivered" ? "Track my Order" : "Request an Order";

  const renderSelectStep = () => (
    <div className="h-full flex flex-col px-4 pt-2 pb-4">
      {/* Step indicator */}
      <div className="shrink-0 pb-2">
        <p className="font-['Poppins',sans-serif] font-semibold text-[9px] text-[#757575] mb-1">STEP 1 OF 2</p>
        <div className="relative h-[11px] rounded-[10px] bg-[#d9d9d9] overflow-hidden">
          <div className="absolute left-0 top-0 h-full rounded-[10px] bg-[#007bc1]" style={{ width: "52%" }} />
        </div>
      </div>
      <p className="shrink-0 font-['Poppins',sans-serif] font-medium text-[13px] text-[#044674] mb-2">Please Select One</p>

      {/* Product cards — flex-1 so they share available height equally */}
      <div className="flex-1 flex flex-col gap-1.5 min-h-0 mb-2">
        {PRODUCTS.map((product) => {
          const isSelected = selectedProduct.id === product.id;
          return (
            <div
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className="flex-1 min-h-0 rounded-[10px] shadow-[0px_2px_10px_0px_rgba(0,0,0,0.25)] border-2 flex items-center overflow-hidden cursor-pointer"
              style={{
                background: isSelected ? "#bee1f7" : "white",
                borderColor: isSelected ? "#002540" : "#007bc1",
              }}
            >
              <div className="shrink-0 flex flex-col items-start justify-between py-1.5 self-stretch" style={{ width: "104px", paddingLeft: "10px" }}>
                <p className="font-['Poppins',sans-serif] font-semibold text-[13px] text-[#044674]">{product.label}</p>
                <img src={product.img} className="h-[60px] w-[48px] object-contain" alt={product.label} />
              </div>
              <div className="flex-1 pr-2 flex items-center justify-center">
                <p className="font-['Poppins',sans-serif] font-light text-[8px] text-[#044674] leading-relaxed text-center">{product.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom fixed section */}
      <div className="shrink-0">
        <div className="h-px bg-[#d9d9d9] mb-2" />
        <div className="flex items-center justify-between mb-2">
          <p className="font-['Poppins',sans-serif] font-semibold text-[15px] text-[#044674]">QUANTITY</p>
          <div className="flex items-center rounded-[10px] bg-[#007bc1]" style={{ height: "29px", width: "95px" }}>
            <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="flex-1 flex items-center justify-center text-white font-['Poppins',sans-serif] font-semibold text-[18px]">-</button>
            <span className="flex-1 text-center text-white font-['Poppins',sans-serif] font-semibold text-[16px]">{qty}</span>
            <button type="button" onClick={() => setQty(qty + 1)} className="flex-1 flex items-center justify-center text-white font-['Poppins',sans-serif] font-semibold text-[18px]">+</button>
          </div>
        </div>
        <div className="h-px bg-[#d9d9d9] mb-2" />
        <div className="flex items-center justify-between mb-1">
          <p className="font-['Poppins',sans-serif] font-semibold text-[15px] text-[#044674]">ESTIMATED COST:</p>
          <p className="font-['Poppins',sans-serif] font-medium text-[15px] text-[#044674]">₱{totalCost.toLocaleString()}</p>
        </div>
        <div className="flex items-center justify-between mb-2">
          <p className="font-['Poppins',sans-serif] font-semibold text-[13px] text-[#044674]">ESTIMATED DELIVERY TIME:</p>
          <p className="font-['Poppins',sans-serif] font-medium text-[12px] text-[#044674]">{selectedProduct.deliveryTime}</p>
        </div>
        <div className="h-px bg-[#d9d9d9] mb-3" />
        <button
          type="button"
          onClick={() => setStep("summary")}
          className="w-full rounded-[8px] h-[38px] font-['Poppins',sans-serif] font-bold text-[12px] text-white"
          style={{ background: "#007bc1" }}
        >
          REVIEW ORDER
        </button>
      </div>
    </div>
  );

  const renderSummaryStep = () => (
    <div className="px-4 pb-6">
      {/* Step indicator */}
      <div className="pt-5 pb-4">
        <p className="font-['Poppins',sans-serif] font-semibold text-[9px] text-[#757575] mb-1">STEP 2 OF 2</p>
        <div className="relative h-[11px] rounded-[10px] bg-[#d9d9d9] overflow-hidden">
          <div className="absolute left-0 top-0 h-full rounded-[10px] bg-[#007bc1] w-full" />
        </div>
      </div>

      {/* Order Summary section */}
      <p className="font-['Poppins',sans-serif] font-semibold text-[16px] text-[#002540] mb-3">Order Summary</p>
      <div className="flex items-center gap-4 mb-3">
        <img src={selectedProduct.img} className="h-[81px] w-[54px] object-contain shrink-0" alt={selectedProduct.label} />
        <div>
          <div className="flex items-center gap-1 mb-1">
            <p className="font-['Poppins',sans-serif] text-[15px] text-[#044674]">Selected Type:</p>
            <p className="font-['Poppins',sans-serif] font-medium text-[15px] text-[#044674]">{selectedProduct.label} - LPG</p>
          </div>
          <div className="flex items-center gap-1">
            <p className="font-['Poppins',sans-serif] text-[15px] text-[#044674]">Quantity:</p>
            <p className="font-['Poppins',sans-serif] font-medium text-[15px] text-[#044674]">{qty}</p>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#d9d9d9] mb-4" />

      {/* Delivery Details */}
      <p className="font-['Poppins',sans-serif] font-semibold text-[16px] text-[#002540] mb-3">Delivery Details</p>
      <div className="flex justify-between mb-2">
        <p className="font-['Poppins',sans-serif] font-semibold text-[13px] text-[#044674]">Name:</p>
        <p className="font-['Poppins',sans-serif] font-medium text-[13px] text-[#044674]">Juan Dela Cruz</p>
      </div>
      <div className="flex justify-between items-start mb-1">
        <p className="font-['Poppins',sans-serif] font-semibold text-[13px] text-[#044674]">Address:</p>
        <p className="font-['Poppins',sans-serif] font-medium text-[13px] text-[#044674] text-right max-w-[60%]">{selectedAddress.address}</p>
      </div>
      <div className="flex justify-end mb-2">
        <button type="button" onClick={() => setModal("selectAddress")} className="font-['Poppins',sans-serif] font-medium text-[10px] text-[#007bc1] underline">Select Address</button>
      </div>
      <div className="flex justify-between mb-2">
        <p className="font-['Poppins',sans-serif] font-semibold text-[13px] text-[#044674]">Contact:</p>
        <p className="font-['Poppins',sans-serif] font-medium text-[13px] text-[#044674]">09123456789</p>
      </div>

      <div className="h-px bg-[#d9d9d9] mb-4" />

      {/* Payment Details */}
      <p className="font-['Poppins',sans-serif] font-semibold text-[16px] text-[#002540] mb-3">Payment Details</p>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          {selectedPayment === "gcash" && <img src={imgGCash} className="h-[24px] w-[29px] object-contain" alt="GCash" />}
          {selectedPayment === "maya" && <img src={imgMaya} className="h-[15px] w-[56px] object-contain" alt="Maya" />}
          {selectedPayment === "cash" && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d={orderProcessSvgPaths.p4f70d00} stroke="#007BC1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          )}
          <p className="font-['Poppins',sans-serif] font-medium text-[13px] text-[#044674]">
            {selectedPayment === "gcash" ? "GCash  ••••6789" : selectedPayment === "maya" ? "Maya" : "Cash"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setTempPayment(selectedPayment); setModal("paymentMethod"); }}
          className="font-['Poppins',sans-serif] font-medium text-[12px] text-[#007bc1]"
        >
          See all
        </button>
      </div>

      <div className="h-px bg-[#d9d9d9] mb-4" />

      {/* Delivery Time */}
      <p className="font-['Poppins',sans-serif] font-semibold text-[16px] text-[#002540] mb-2">Delivery Time</p>
      <div className="flex justify-between mb-2">
        <p className="font-['Poppins',sans-serif] font-semibold text-[13px] text-[#044674]">Estimated Delivery Time:</p>
        <p className="font-['Poppins',sans-serif] font-medium text-[13px] text-[#044674]">{selectedProduct.deliveryTime}</p>
      </div>

      <div className="h-px bg-[#d9d9d9] mb-4" />

      {/* Cost & Loyalty Rewards */}
      <p className="font-['Poppins',sans-serif] font-semibold text-[16px] text-[#002540] mb-2">Cost & Loyalty Rewards</p>
      <div className="flex justify-between mb-1">
        <p className="font-['Poppins',sans-serif] font-semibold text-[13px] text-[#044674]">Estimated Cost:</p>
        <p className="font-['Poppins',sans-serif] font-medium text-[13px] text-[#044674]">₱ {totalCost.toLocaleString()}</p>
      </div>
      <div className="flex justify-between mb-2">
        <p className="font-['Poppins',sans-serif] font-semibold text-[13px] text-[#044674]">Loyalty Points:</p>
        <p className="font-['Poppins',sans-serif] font-medium text-[13px] text-[#4bad40]">+50 pts</p>
      </div>

      <div className="h-px bg-[#d9d9d9] mb-4" />

      {/* Schedule for Later */}
      <p className="font-['Poppins',sans-serif] font-semibold text-[16px] text-[#002540] mb-2">Schedule for Later</p>
      <button
        type="button"
        onClick={() => { setSchedPickerTab("date"); setModal("schedPicker"); }}
        className="w-[303px] h-[32px] border rounded-[5px] px-3 flex items-center justify-between"
        style={{ borderColor: schedConfirmedLabel ? "#1c57b6" : "#d9d9d9" }}
      >
        <p className="font-['Poppins',sans-serif] text-[12px]" style={{ color: schedConfirmedLabel ? "#044674" : "#989898" }}>
          {schedConfirmedLabel || "Select date and time"}
        </p>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d={orderProcessSvgPaths.p23b890c0} stroke="#989898" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="h-px bg-[#d9d9d9] my-4" />

      {/* Place Order */}
      <button
        type="button"
        onClick={() => setModal("confirmed")}
        className="w-full rounded-[8px] h-[38px] font-['Poppins',sans-serif] font-bold text-[12px] text-white"
        style={{ background: "#007bc1" }}
      >
        PLACE ORDER
      </button>
    </div>
  );

  const renderHorizontalStepper = (doneCount: number) => {
    const stepLabels = ["Order Confirmed", "Preparing", "Out for Delivery", "Delivered"];
    return (
      <div className="flex items-start w-full">
        {stepLabels.map((label, i) => {
          const done = i < doneCount;
          const active = i === doneCount && doneCount < 4;
          const isLast = i === stepLabels.length - 1;
          const circBg = done ? (i === 0 ? "#4bad40" : "#1db418") : active ? "white" : "#f0f6ff";
          const circBorder = done ? (i === 0 ? "#4bad40" : "#1db418") : active ? "#8db5f6" : "#c0d5de";
          const lineColor = done ? (i === 0 ? "#4bad40" : "#1db418") : "#c0d5de";
          return (
            <div key={label} className={`flex flex-col items-start ${isLast ? "shrink-0" : "flex-1 min-w-0"}`}>
              <div className="flex items-center w-full">
                <div
                  className="rounded-full shrink-0 flex items-center justify-center overflow-clip"
                  style={{ width: "36px", height: "36px", background: circBg, border: `1px solid ${circBorder}` }}
                >
                  {done ? (
                    <div style={{ width: "14px", height: "12px" }}>
                      <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
                        <path clipRule="evenodd" d={orderProcessSvgPaths.p33307f00} fill="white" fillRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <div className="rounded-full" style={{ width: "12px", height: "12px", background: active ? "#007bc1" : "#c0d5de" }} />
                  )}
                </div>
                {!isLast && <div className="flex-1 h-px min-w-0" style={{ background: lineColor }} />}
              </div>
              <p className="pt-1.5 font-['Inter',sans-serif] font-semibold text-[12px] leading-[16px]" style={{ color: active ? "#143263" : "#3a3e44" }}>
                {label}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTrackOrderSummary = () => (
    <>
      <div className="h-px bg-[#d9d9d9] my-4" />
      <p className="font-['Poppins',sans-serif] font-semibold text-[16px] text-[#002540] mb-3">Order Summary</p>
      <div className="flex items-center gap-4 mb-3">
        <img src={selectedProduct.img} className="h-[81px] w-[54px] object-contain shrink-0" alt={selectedProduct.label} />
        <div>
          <div className="flex items-center gap-1 mb-1">
            <p className="font-['Poppins',sans-serif] text-[15px] text-[#044674]">Selected Type:</p>
            <p className="font-['Poppins',sans-serif] font-medium text-[15px] text-[#044674] ml-1">{selectedProduct.label} - LPG</p>
          </div>
          <div className="flex items-center gap-1">
            <p className="font-['Poppins',sans-serif] text-[15px] text-[#044674]">Quantity:</p>
            <p className="font-['Poppins',sans-serif] font-medium text-[15px] text-[#044674] ml-1">{qty}</p>
          </div>
        </div>
      </div>
      <div className="h-px bg-[#d9d9d9] mb-4" />
      <p className="font-['Poppins',sans-serif] font-semibold text-[16px] text-[#002540] mb-3">Delivery Details</p>
      <div className="flex justify-between mb-2">
        <p className="font-['Poppins',sans-serif] font-semibold text-[13px] text-[#044674]">Name:</p>
        <p className="font-['Poppins',sans-serif] font-medium text-[13px] text-[#044674]">Juan Dela Cruz</p>
      </div>
      <div className="flex justify-between mb-2">
        <p className="font-['Poppins',sans-serif] font-semibold text-[13px] text-[#044674]">Address:</p>
        <p className="font-['Poppins',sans-serif] font-medium text-[13px] text-[#044674] text-right max-w-[60%]">{selectedAddress.address}</p>
      </div>
      <div className="flex justify-between mb-2">
        <p className="font-['Poppins',sans-serif] font-semibold text-[13px] text-[#044674]">Contact:</p>
        <p className="font-['Poppins',sans-serif] font-medium text-[13px] text-[#044674]">09123456789</p>
      </div>
      <div className="h-px bg-[#d9d9d9] mb-4" />
      <p className="font-['Poppins',sans-serif] font-semibold text-[16px] text-[#002540] mb-2">Payment Details</p>
      <div className="flex items-center gap-2 mb-2">
        {selectedPayment === "gcash" && <img src={imgGCash} className="h-[24px] w-[29px] object-contain" alt="GCash" />}
        {selectedPayment === "maya" && <img src={imgMaya} className="h-[15px] w-[56px] object-contain" alt="Maya" />}
        {selectedPayment === "cash" && (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d={orderProcessSvgPaths.p4f70d00} stroke="#007BC1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        )}
        <p className="font-['Poppins',sans-serif] font-medium text-[13px] text-[#044674]">
          {selectedPayment === "gcash" ? "GCash  ••••6789" : selectedPayment === "maya" ? "Maya" : "Cash"}
        </p>
      </div>
      <div className="h-px bg-[#d9d9d9] mb-4" />
      <p className="font-['Poppins',sans-serif] font-semibold text-[16px] text-[#002540] mb-2">Delivery Time</p>
      <div className="flex justify-between mb-2">
        <p className="font-['Poppins',sans-serif] font-semibold text-[13px] text-[#044674]">Estimated Delivery Time:</p>
        <p className="font-['Poppins',sans-serif] font-medium text-[13px] text-[#044674]">{selectedProduct.deliveryTime}</p>
      </div>
      <div className="h-px bg-[#d9d9d9] mb-4" />
      <p className="font-['Poppins',sans-serif] font-semibold text-[16px] text-[#002540] mb-2">Cost & Loyalty Rewards</p>
      <div className="flex justify-between mb-1">
        <p className="font-['Poppins',sans-serif] font-semibold text-[13px] text-[#044674]">Estimated Cost:</p>
        <p className="font-['Poppins',sans-serif] font-medium text-[13px] text-[#044674]">₱ {totalCost.toLocaleString()}</p>
      </div>
      <div className="flex justify-between pb-6">
        <p className="font-['Poppins',sans-serif] font-semibold text-[13px] text-[#044674]">Loyalty Points:</p>
        <p className="font-['Poppins',sans-serif] font-medium text-[13px] text-[#4bad40]">+50 pts</p>
      </div>
    </>
  );

  const renderTrackStep = () => {
    if (trackDelivered) {
      // DeliverySuccess layout
      return (
        <div className="px-6">
          <div className="pt-3 pb-5">{renderHorizontalStepper(4)}</div>
          <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#044674] text-center mb-4">Delivery Complete!</p>
          <div className="flex justify-between mb-2">
            <p className="font-['Poppins',sans-serif] font-semibold text-[15px] text-[#044674]">Order Number:</p>
            <p className="font-['Poppins',sans-serif] font-medium text-[15px] text-[#044674]">LPG-12345</p>
          </div>
          <div className="flex justify-between mb-2">
            <p className="font-['Poppins',sans-serif] font-semibold text-[15px] text-[#044674]">Time of Delivery:</p>
            <p className="font-['Poppins',sans-serif] font-medium text-[15px] text-[#044674]">10:00 AM</p>
          </div>
          <div className="flex justify-between mb-4">
            <p className="font-['Poppins',sans-serif] font-semibold text-[15px] text-[#044674]">Driver:</p>
            <p className="font-['Poppins',sans-serif] font-medium text-[15px] text-[#044674]">Mario</p>
          </div>
          <button
            type="button"
            onClick={() => { setFeedbackStep("rider"); }}
            className="w-full rounded-[8px] h-[38px] font-['Poppins',sans-serif] font-bold text-[12px] text-white"
            style={{ background: "#007bc1" }}
          >
            SUBMIT FEEDBACK
          </button>
          {renderTrackOrderSummary()}
        </div>
      );
    }

    if (isScheduled) {
      // ProgressScheduled layout
      return (
        <div className="px-6">
          <div className="pt-3 pb-5">{renderHorizontalStepper(2)}</div>
          <div className="flex justify-between items-center mb-1">
            <p className="font-['Poppins',sans-serif] font-semibold text-[9px] text-[#757575]">TIME REMAINING</p>
            <p className="font-['Poppins',sans-serif] font-semibold text-[9px] text-[#4bad40]">1 DAY</p>
          </div>
          <div className="relative h-[11px] rounded-[10px] bg-[#d9d9d9] overflow-hidden mb-4">
            <div className="absolute left-0 top-0 h-full rounded-[10px] bg-[#007bc1]" style={{ width: "63%" }} />
          </div>
          <div className="flex justify-between mb-1">
            <p className="font-['Poppins',sans-serif] font-semibold text-[15px] text-[#044674]">Order Number:</p>
            <p className="font-['Poppins',sans-serif] font-medium text-[15px] text-[#044674]">LPG-12345</p>
          </div>
          <div className="flex justify-between mb-3">
            <p className="font-['Poppins',sans-serif] font-semibold text-[15px] text-[#044674]">Scheduled Delivery:</p>
            <p className="font-['Poppins',sans-serif] font-medium text-[13px] text-[#044674] text-right max-w-[55%]">
              {schedConfirmedLabel || "Tomorrow, 10:00 AM - 1:00 PM"}
            </p>
          </div>
          <p className="font-['Poppins',sans-serif] text-[14px] text-[#7d7f7e] mb-2">{"We'll notify you if your order has a rider ready."}</p>
          {renderTrackOrderSummary()}
        </div>
      );
    }

    // Normal progress — ORDER# pill, ETA, status text, stepper, rider, notify, summary
    return (
      <div className="px-6">
        {/* ORDER# pill */}
        <div className="flex justify-center pt-2 mb-3">
          <div className="rounded-[10px] px-3 py-1" style={{ background: "rgba(0,123,193,0.2)" }}>
            <p className="font-['Poppins',sans-serif] font-medium text-[14px] text-[#007bc1]">ORDER# 12345</p>
          </div>
        </div>
        {/* ETA time */}
        <p className="font-['Poppins',sans-serif] font-bold text-[24px] text-[#007bc1] mb-2">{selectedProduct.deliveryTime}</p>
        {/* Status text */}
        <p className="font-['Poppins',sans-serif] font-medium text-[14px] text-[#7d7f7e] mb-5">Superkalan Gaz - Metro Manila Branch is preparing your order.</p>
        {/* Stepper */}
        <div className="mb-3">{renderHorizontalStepper(2)}</div>
        {/* Notify text */}
        <p className="font-['Poppins',sans-serif] text-[14px] text-[#7d7f7e] mb-3">{"We'll notify you if your order is out for delivery."}</p>
        {/* Rider info */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="rounded-full bg-[#8f9297] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.1)] flex items-center justify-center shrink-0 p-2"
            style={{ width: "36px", height: "36px", border: "1px solid #e0e2e6" }}
          >
            <svg width="13" height="16" viewBox="0 0 13.2333 16" fill="none">
              <path d={orderProcessSvgPaths.p1984d200} fill="white" />
              <path d={orderProcessSvgPaths.p1d7f2bf0} fill="white" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-['Poppins',sans-serif] font-medium text-[14px] text-[#002540]">Mario Perez</p>
            <p className="font-['Poppins',sans-serif] text-[14px] text-[#7d7f7e]">Honda Click • ABC 1234</p>
          </div>
          <div className="flex items-center gap-1">
            <svg width="15" height="15" viewBox="0 0 12.5 11.875" fill="none">
              <path d={orderProcessSvgPaths.p23a74000} fill="#FFD147" />
            </svg>
            <p className="font-['Poppins',sans-serif] text-[14px] text-[#7d7f7e]">4.8</p>
          </div>
        </div>
        {/* Simulate delivery (dev helper) */}
        <button
          type="button"
          onClick={() => setTrackDelivered(true)}
          className="w-full rounded-[8px] h-[32px] font-['Poppins',sans-serif] font-medium text-[11px] mb-1 border border-[#007bc1] text-[#007bc1]"
        >
          Simulate Delivery
        </button>
        {renderTrackOrderSummary()}
      </div>
    );
  };

  const renderSelectAddressModal = () => (
    <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: "rgba(30,30,30,0.2)" }}>
      <div className="bg-white rounded-[10px] mx-6 w-[358px] p-5 shadow-xl relative">
        <div className="flex items-center justify-between mb-1">
          <p className="font-['Poppins',sans-serif] font-semibold text-[16px] text-[#002540]">Select Address</p>
          <button type="button" onClick={() => setModal("none")}>
            <svg width="20" height="20" viewBox="0 0 12 12" fill="none">
              <path d="M11 1L1 11M1 1L11 11" stroke="#D9D9D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d={orderProcessSvgPaths.p17b34a80} stroke="#CFCFCF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d={orderProcessSvgPaths.pe81c400} stroke="#CFCFCF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="font-['Poppins',sans-serif] font-semibold text-[12px] text-[#989898]">Delivery Address</p>
        </div>

        {ADDRESSES.map((addr) => {
          const isSelected = selectedAddress.id === addr.id;
          return (
            <div key={addr.id} className="flex items-start justify-between mb-4">
              <div className="flex flex-col gap-0.5">
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setSelectedAddress(addr)}
                >
                  <div className="relative shrink-0" style={{ width: "16px", height: "16px" }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d={orderProcessSvgPaths.p36ca9a00} fill={isSelected ? "#F5F5F5" : "white"} />
                      <path d={orderProcessSvgPaths.p251d4c00} fill={isSelected ? "#007BC1" : "#757575"} />
                      {isSelected && <circle cx="8" cy="8" r="5" fill="#007BC1" />}
                    </svg>
                  </div>
                  <p className="font-['Inter',sans-serif] text-[15px] text-[#1e1e1e]">{addr.label}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div style={{ width: "16px" }} />
                  <p className="font-['Inter',sans-serif] text-[15px] text-[#757575]">{addr.address}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setEditAddrLabel(addr.label); setEditAddrAddress(addr.address); setEditAddrContact("09123456789"); setModal("editAddress"); }}
                className="font-['Poppins',sans-serif] font-medium text-[10px] text-[#007bc1] shrink-0 ml-2"
              >Change</button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => { setEditAddrLabel(""); setEditAddrAddress(""); setEditAddrContact(""); setModal("editAddress"); }}
          className="w-full text-center font-['Poppins',sans-serif] font-semibold text-[11px] text-[#007bc1] pt-1"
        >
          +     Add New Address
        </button>
      </div>
    </div>
  );

  const renderEditAddressModal = () => (
    <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: "rgba(30,30,30,0.2)" }}>
      <div className="bg-white rounded-[10px] mx-6 w-[358px] p-5 shadow-xl relative">
        <div className="flex items-center justify-between mb-4">
          <p className="font-['Poppins',sans-serif] font-semibold text-[16px] text-[#002540]">Edit Address</p>
          <button type="button" onClick={() => setModal("selectAddress")}>
            <svg width="20" height="20" viewBox="0 0 12 12" fill="none">
              <path d="M11 1L1 11M1 1L11 11" stroke="#D9D9D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="mb-3">
          <p className="font-['Poppins',sans-serif] font-medium text-[10px] text-[#007bc1] mb-1">Label Address</p>
          <input
            className="w-full h-[26px] border border-[#d9d9d9] rounded-[5px] px-2 font-['Poppins',sans-serif] text-[12px] text-[#7d7f7e]"
            value={editAddrLabel}
            onChange={(e) => setEditAddrLabel(e.target.value)}
            placeholder="House 1"
          />
        </div>
        <div className="mb-3">
          <p className="font-['Poppins',sans-serif] font-medium text-[10px] text-[#007bc1] mb-1">Address</p>
          <input
            className="w-full h-[26px] border border-[#d9d9d9] rounded-[5px] px-2 font-['Poppins',sans-serif] text-[12px] text-[#7d7f7e]"
            value={editAddrAddress}
            onChange={(e) => setEditAddrAddress(e.target.value)}
            placeholder="123 Main St., Metro Manila"
          />
        </div>
        <div className="mb-3">
          <p className="font-['Poppins',sans-serif] font-medium text-[10px] text-[#007bc1] mb-1">Contact Number</p>
          <input
            className="w-full h-[26px] border border-[#d9d9d9] rounded-[5px] px-2 font-['Poppins',sans-serif] text-[12px] text-[#7d7f7e]"
            value={editAddrContact}
            onChange={(e) => setEditAddrContact(e.target.value)}
            placeholder="09123456789"
          />
        </div>
        <div className="mb-3">
          <p className="font-['Poppins',sans-serif] font-medium text-[10px] text-[#007bc1] mb-1">Note to Driver</p>
          <textarea
            className="w-full h-[66px] border border-[#d9d9d9] rounded-[5px] px-2 py-2 font-['Poppins',sans-serif] text-[12px] text-[#b1b1b1] resize-none"
            value={editAddrNote}
            onChange={(e) => setEditAddrNote(e.target.value)}
            placeholder="Type note to driver..."
          />
        </div>
        <div className="flex items-center gap-2 mb-4">
          <div
            className="border-2 border-[#007bc1] rounded-[2px] flex items-center justify-center cursor-pointer"
            style={{ width: "15px", height: "15px", background: editAddrPrimary ? "#007bc1" : "white" }}
            onClick={() => setEditAddrPrimary(!editAddrPrimary)}
          >
            {editAddrPrimary && (
              <svg width="10" height="8" viewBox="0 0 12 9.6" fill="none">
                <path d={orderProcessSvgPaths.p2ea7ce0} stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <p className="font-['Poppins',sans-serif] text-[10px] text-[#7d7f7e]">Set Primary Address</p>
        </div>

        <button
          type="button"
          onClick={handleSaveAddress}
          className="font-['Poppins',sans-serif] font-bold text-[12px] text-white rounded-[8px] h-[38px] mx-auto block"
          style={{ background: "#007bc1", width: "290px" }}
        >
          SAVE CHANGES
        </button>
      </div>
    </div>
  );

  const renderSchedPickerModal = () => {
    const calDays = ["S","M","T","W","T","F","S"];
    const calRows = [
      [null,null,null,null,null,1,2],
      [3,4,5,6,7,8,9],
      [10,11,12,13,14,15,16],
      [17,18,19,20,21,22,23],
      [24,25,26,27,28,29,30],
      [31,null,null,null,null,null,null],
    ] as (number | null)[][];
    const handleConfirm = () => {
      const label = `10-${String(schedSelDay).padStart(2,"0")}-2024, ${schedHour}:${schedMinute} ${schedAmPm}`;
      setSchedConfirmedLabel(label);
      setIsScheduled(true);
      setModal("none");
      showToastMsg(`Scheduled for ${label}`);
    };

    return (
      <div className="absolute inset-0 z-20 flex items-end justify-center pb-10" style={{ background: "rgba(30,30,30,0.2)" }}>
        <div className="bg-white rounded-[10px] mx-6 w-[338px] shadow-xl relative" style={{ paddingBottom: "20px" }}>
          <button type="button" onClick={() => setModal("none")} className="absolute top-3 right-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="#7D7F7E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="px-5 pt-4">
            <p className="font-['Poppins',sans-serif] font-bold text-[16px] text-[#007bc1]">Schedule for Later</p>
            <p className="font-['Poppins',sans-serif] text-[11px] text-[#757575] mb-3">When do you want your order to be delivered?</p>
            {/* Input display */}
            <div className="flex items-center gap-2 border rounded-[5px] px-3 h-[32px] mb-3" style={{ borderColor: "#1c57b6" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d={orderProcessSvgPaths.p23b890c0} stroke="#989898" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="font-['Poppins',sans-serif] text-[12px] text-[#044674] flex-1">
                {schedPickerTab === "date"
                  ? `10-${String(schedSelDay).padStart(2,"0")}-2024`
                  : `10-${String(schedSelDay).padStart(2,"0")}-2024, ${schedHour}:${schedMinute} ${schedAmPm}`}
              </p>
            </div>
            {/* Date/Time tabs */}
            <div className="flex rounded-[6px] p-0.5 mb-3" style={{ background: "#f4f5f6" }}>
              {(["date","time"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSchedPickerTab(tab)}
                  className="flex-1 rounded-[4px] h-[28px] font-['Poppins',sans-serif] text-[12px] font-medium transition-colors"
                  style={{ background: schedPickerTab === tab ? "white" : "transparent", color: schedPickerTab === tab ? "#007bc1" : "#757575" }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {schedPickerTab === "date" ? (
            <div className="mx-5 rounded-[8px] p-3" style={{ background: "#f5f5f5" }}>
              <div className="flex items-center justify-between mb-2">
                <button type="button" className="font-['Poppins',sans-serif] text-[12px] text-[#044674] px-2">{"<"}</button>
                <p className="font-['Poppins',sans-serif] font-semibold text-[13px] text-[#044674]">March 2024</p>
                <button type="button" className="font-['Poppins',sans-serif] text-[12px] text-[#044674] px-2">{">"}</button>
              </div>
              <div className="grid grid-cols-7 mb-1">
                {calDays.map((d, i) => (
                  <p key={i} className="text-center font-['Poppins',sans-serif] text-[10px] text-[#989898] font-semibold">{d}</p>
                ))}
              </div>
              {calRows.map((row, ri) => (
                <div key={ri} className="grid grid-cols-7">
                  {row.map((day, ci) => (
                    <button
                      key={ci}
                      type="button"
                      disabled={!day}
                      onClick={() => day && setSchedSelDay(day)}
                      className="flex items-center justify-center rounded-full mx-auto my-0.5"
                      style={{ width: "28px", height: "28px", background: day === schedSelDay ? "#1c57b6" : "transparent" }}
                    >
                      {day && (
                        <p className="font-['Poppins',sans-serif] text-[12px]" style={{ color: day === schedSelDay ? "white" : "#044674" }}>{day}</p>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="mx-5 rounded-[8px] p-4" style={{ background: "#f5f5f5" }}>
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex flex-col items-center gap-1">
                  <button type="button" onClick={() => setSchedHour(h => String((parseInt(h) % 12) + 1).padStart(2,"0"))} className="text-[#007bc1] text-[18px] leading-none">▲</button>
                  <div className="bg-white rounded-[5px] w-[50px] h-[36px] flex items-center justify-center">
                    <p className="font-['Poppins',sans-serif] font-semibold text-[18px] text-[#044674]">{schedHour}</p>
                  </div>
                  <button type="button" onClick={() => setSchedHour(h => String(((parseInt(h) - 2 + 12) % 12) + 1).padStart(2,"0"))} className="text-[#007bc1] text-[18px] leading-none">▼</button>
                  <p className="font-['Poppins',sans-serif] text-[10px] text-[#989898]">Hours</p>
                </div>
                <p className="font-['Poppins',sans-serif] font-bold text-[20px] text-[#044674] pb-5">:</p>
                <div className="flex flex-col items-center gap-1">
                  <button type="button" onClick={() => setSchedMinute(m => String((parseInt(m) + 5) % 60).padStart(2,"0"))} className="text-[#007bc1] text-[18px] leading-none">▲</button>
                  <div className="bg-white rounded-[5px] w-[50px] h-[36px] flex items-center justify-center">
                    <p className="font-['Poppins',sans-serif] font-semibold text-[18px] text-[#044674]">{schedMinute}</p>
                  </div>
                  <button type="button" onClick={() => setSchedMinute(m => String((parseInt(m) - 5 + 60) % 60).padStart(2,"0"))} className="text-[#007bc1] text-[18px] leading-none">▼</button>
                  <p className="font-['Poppins',sans-serif] text-[10px] text-[#989898]">Minutes</p>
                </div>
                <div className="flex flex-col rounded-[6px] overflow-hidden ml-2" style={{ background: "#f4f5f6" }}>
                  {(["AM","PM"] as const).map((ap) => (
                    <button
                      key={ap}
                      type="button"
                      onClick={() => setSchedAmPm(ap)}
                      className="px-3 py-1.5 font-['Poppins',sans-serif] text-[12px] font-medium"
                      style={{ background: schedAmPm === ap ? "white" : "transparent", color: schedAmPm === ap ? "#007bc1" : "#757575" }}
                    >
                      {ap}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={schedPickerTab === "date" ? () => setSchedPickerTab("time") : handleConfirm}
              className="rounded-[5px] h-[30px] font-['Poppins',sans-serif] font-bold text-[12px] text-white"
              style={{ background: "#007bc1", width: "278px" }}
            >
              {schedPickerTab === "date" ? "NEXT: SELECT TIME" : "CONFIRM"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPaymentMethodModal = () => {
    const paymentOptions: { key: "gcash" | "maya" | "cash"; label: string; sub: string; icon: React.ReactNode }[] = [
      {
        key: "gcash",
        label: "GCash •••• 6789",
        sub: "Default",
        icon: <img src={imgGCash} className="h-[24px] w-[29px] object-contain" alt="GCash" />,
      },
      {
        key: "maya",
        label: "Maya",
        sub: "",
        icon: <img src={imgMaya} className="h-[15px] w-[56px] object-contain" alt="Maya" />,
      },
      {
        key: "cash",
        label: "Cash",
        sub: "",
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d={orderProcessSvgPaths.p4f70d00} stroke="#007BC1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        ),
      },
    ];
    return (
      <div className="absolute inset-0 z-20" style={{ background: "rgba(0,0,0,0.3)" }} onClick={() => setModal("none")}>
        <div
          className="absolute bottom-0 left-0 right-0 bg-white rounded-tl-[20px] rounded-tr-[20px] pt-5 pb-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 mb-4">
            <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#044674]">Select Payment Method</p>
            <button type="button" onClick={() => setModal("none")}>
              <svg width="16" height="16" viewBox="0 0 9.6 9.6" fill="none">
                <path d={orderProcessSvgPaths.p307eee40} stroke="#757575" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
              </svg>
            </button>
          </div>
          {paymentOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setTempPayment(opt.key)}
              className="w-full flex items-center gap-4 px-5 py-3"
            >
              <div className="flex items-center justify-center shrink-0" style={{ width: "56px" }}>{opt.icon}</div>
              <div className="flex-1 text-left">
                <p className="font-['Poppins',sans-serif] text-[11px] text-[#002540]">{opt.label}</p>
                {opt.sub && (
                  <div className="inline-block rounded-[10px] px-2 mt-0.5" style={{ background: "#d9d9d9" }}>
                    <p className="font-['Poppins',sans-serif] font-medium text-[10px] text-[#757575]">{opt.sub}</p>
                  </div>
                )}
              </div>
              {/* Radio button */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <mask fill="white" id={`radio-mask-${opt.key}`}>
                  <path d={orderProcessSvgPaths.p36ca9a00} />
                </mask>
                <path d={orderProcessSvgPaths.p36ca9a00} fill="white" />
                <path d={orderProcessSvgPaths.p251d4c00} fill={tempPayment === opt.key ? "#007BC1" : "#757575"} mask={`url(#radio-mask-${opt.key})`} />
                {tempPayment === opt.key && <circle cx="8" cy="8" r="5" fill="#007BC1" />}
              </svg>
            </button>
          ))}
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={() => {
                setSelectedPayment(tempPayment);
                setModal("none");
                showToastMsg("Payment Method Successfully Changed");
              }}
              className="rounded-[10px] h-[47px] font-['Poppins',sans-serif] font-semibold text-[15px] text-white"
              style={{ background: "#007bc1", width: "354px" }}
            >
              SAVE CHANGES
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStarRow = (rating: number, onRate: (n: number) => void) => (
    <div className="flex gap-3 justify-center">
      {[1,2,3,4,5].map((n) => (
        <button key={n} type="button" onClick={() => onRate(n)} style={{ width: "60px", height: "60px" }}>
          <svg width="60" height="57" viewBox="0 0 50 47.5" fill="none">
            <path d={orderProcessSvgPaths.p273e7980} fill={n <= rating ? "#FFD147" : "#D9D9D9"} />
          </svg>
        </button>
      ))}
    </div>
  );

  const renderFeedbackModal = () => {
    if (feedbackStep === "xfeedback") {
      return (
        <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)" }}>
          <div className="relative bg-white rounded-[10px] mx-6 w-[338px]" style={{ paddingBottom: "24px" }}>
            <img src={imgNotInMood} className="w-[119px] h-[171px] object-contain mx-auto -mt-16 relative z-10" alt="Not in the mood" />
            <button type="button" onClick={() => setFeedbackStep("none")} className="absolute top-3 right-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="#7D7F7E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <p className="font-['Poppins',sans-serif] font-bold text-[20px] text-[#007bc1] text-center px-4 mb-2">Not in the mood?</p>
            <p className="font-['Poppins',sans-serif] font-semibold text-[10px] text-[#007bc1] text-center px-6 leading-relaxed">
              {`You can still rate our services and rider within 24 hours since your last order.\n\nIf the time is reached, your reward points won't be added to your account.`}
            </p>
          </div>
        </div>
      );
    }

    const isRider = feedbackStep === "rider";
    return (
      <div className="absolute inset-0 z-30" style={{ background: "rgba(0,0,0,0.3)" }}>
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-tl-[20px] rounded-tr-[20px] pt-5 pb-8">
          <button
            type="button"
            onClick={() => setFeedbackStep("xfeedback")}
            className="absolute top-4 right-4"
          >
            <svg width="16" height="16" viewBox="0 0 9.6 9.6" fill="none">
              <path d={orderProcessSvgPaths.p307eee40} stroke="#757575" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
            </svg>
          </button>
          {/* Step progress dots */}
          <div className="flex items-center gap-1 px-5 mb-4">
            <div className="rounded-full" style={{ width: "8px", height: "8px", background: "#989898" }} />
            <div className="flex-1 h-px" style={{ background: "#989898" }} />
            <div className="rounded-full" style={{ width: "8px", height: "8px", background: isRider ? "#d9d9d9" : "#989898" }} />
          </div>
          {/* Rider avatar (only for rider step) */}
          {isRider && (
            <div className="flex justify-center mb-3">
              <div
                className="rounded-full bg-[#8f9297] flex items-center justify-center"
                style={{ width: "100px", height: "100px", border: "1px solid #e0e2e6" }}
              >
                <svg width="52" height="52" viewBox="0 0 34.4065 41.6" fill="none">
                  <path d={orderProcessSvgPaths.p16947b00} fill="white" />
                  <path d={orderProcessSvgPaths.p2b5a3a00} fill="white" />
                </svg>
              </div>
            </div>
          )}
          <p className="font-['Poppins',sans-serif] font-semibold text-[20px] text-[#044674] px-5 mb-1">How was your experience?</p>
          <p className="font-['Poppins',sans-serif] text-[16px] text-[#7d7f7e] px-5 mb-5">
            {isRider ? "Help us improve your delivery experience by rating your rider." : "Help us improve your delivery experience by rating our branch."}
          </p>
          {renderStarRow(isRider ? riderRating : storeRating, isRider ? setRiderRating : setStoreRating)}
          {!isRider && (
            <div className="mx-5 mt-4">
              <div className="border border-[#d9d9d9] rounded-[5px] h-[121px] w-full px-4 py-3">
                <textarea
                  className="w-full h-full font-['Poppins',sans-serif] text-[16px] resize-none outline-none"
                  placeholder="Write your thoughts..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  style={{ color: "#002540" }}
                />
              </div>
            </div>
          )}
          <div className="flex justify-center mt-5">
            <button
              type="button"
              onClick={() => {
                if (isRider) {
                  setFeedbackStep("store");
                } else {
                  setFeedbackStep("none");
                  showToastMsg("Thank you for your feedback!");
                }
              }}
              className="rounded-[10px] h-[47px] font-['Poppins',sans-serif] font-semibold text-[15px] text-white"
              style={{ background: "#007bc1", width: "354px" }}
            >
              {isRider ? "Next" : "Submit Feedback"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderConfirmedModal = () => (
    <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: "rgba(30,30,30,0.2)" }}>
      <div className="bg-white rounded-[10px] mx-6 w-[338px] shadow-xl relative" style={{ paddingBottom: "20px" }}>
        <button type="button" onClick={() => setModal("none")} className="absolute top-3 right-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="#7D7F7E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex justify-center pt-6 pb-3">
          <div className="rounded-full flex items-center justify-center" style={{ width: "120px", height: "120px", background: "#1DB418" }}>
            <svg width="60" height="46" viewBox="0 0 44 33.333" fill="none">
              <path d={orderProcessSvgPaths.p9380e00} stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <p className="text-center font-['Poppins',sans-serif] font-bold text-[20px] text-[#007bc1] mb-2">Order Confirmed!</p>
        <div className="text-center px-4 mb-4">
          <p className="font-['Poppins',sans-serif] text-[10px] text-[#007bc1] leading-relaxed">
            <span className="font-bold">Order# 12345</span> is confirmed at 11:30 AM
            <br />
            <span className="font-medium">Branch:</span> Superkalan Gaz - Metro Manila
            <br />
            <span className="font-medium">Contact Number:</span> 09171234567
            {schedConfirmedLabel && (
              <>
                <br />
                <span className="font-medium">Scheduled:</span> {schedConfirmedLabel}
              </>
            )}
          </p>
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => { setModal("none"); setStep("track"); }}
            className="rounded-[8px] h-[38px] font-['Poppins',sans-serif] font-bold text-[12px] text-white"
            style={{ background: "#007bc1", width: "278px" }}
          >
            SEE ORDER RECEIPT
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative bg-white">
      {/* ── Inline Header (white, no blue bar) ── */}
      <div className="shrink-0 w-full flex items-center px-4 pt-12 pb-2">
        <button
          type="button"
          onClick={() => step === "select" ? onNavigate({ screen: "home", history: [] }) : step === "summary" ? setStep("select") : setStep("summary")}
          className="p-1 shrink-0"
        >
          <ChevronLeft size={24} color="#044674" />
        </button>
        <p className="flex-1 text-center font-['Poppins',sans-serif] font-bold text-[24px] text-[#044674] leading-tight">
          {headerTitle}
        </p>
        {/* spacer to keep title visually centered */}
        <div style={{ width: "32px" }} />
      </div>

      {/* ── Content ── */}
      <div
        className={`flex-1 bg-white [&::-webkit-scrollbar]:hidden ${step === "select" ? "overflow-hidden" : "overflow-y-auto pb-6"}`}
        style={{ scrollbarWidth: "none" }}
      >
        {step === "select" && renderSelectStep()}
        {step === "summary" && renderSummaryStep()}
        {(step === "track" || step === "delivered") && renderTrackStep()}
      </div>

      {/* ── Modals ── */}
      {modal === "selectAddress" && renderSelectAddressModal()}
      {modal === "editAddress" && renderEditAddressModal()}
      {modal === "schedPicker" && renderSchedPickerModal()}
      {modal === "confirmed" && renderConfirmedModal()}
      {modal === "paymentMethod" && renderPaymentMethodModal()}

      {/* ── Feedback sheets ── */}
      {feedbackStep !== "none" && renderFeedbackModal()}

      {/* ── Toast ── */}
      {toastMsg !== "" && (
        <div className="absolute top-[125px] left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-[11px]" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="rounded-full bg-[#50AF77] flex items-center justify-center shrink-0" style={{ width: "27px", height: "27px" }}>
            <svg width="12" height="10" viewBox="0 0 12 9.6" fill="none">
              <path d={orderProcessSvgPaths.p2ea7ce0} stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="font-['Poppins',sans-serif] font-semibold text-white text-[11px]">{toastMsg}</p>
        </div>
      )}

      {/* ── Slide-out Menu ── */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setMenuOpen(false)} />
      )}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300"
        style={{ width: "200px", background: "#044674", transform: menuOpen ? "translateX(0)" : "translateX(100%)" }}
      >
        <div className="flex justify-end px-4 pt-6 pb-3">
          <img src={imgLogo} className="object-contain" style={{ height: "36px", width: "50px", filter: "brightness(0) invert(1)" }} alt="Superkalan Gaz" />
        </div>
        <div className="flex flex-col items-center px-6 pb-4">
          <div className="rounded-full flex items-center justify-center mb-2" style={{ width: "56px", height: "56px", background: "#8f9297" }}>
            <User size={28} color="white" />
          </div>
          <p className="font-['Poppins',sans-serif] font-semibold text-[13px] text-white text-center">Juan Dela Cruz</p>
        </div>
        <div className="border-t border-white/20 mx-4 mb-2" />
        {[
          { label: "Profile", icon: <User size={18} /> },
          { label: "My Orders", icon: <ShoppingBag size={18} /> },
          { label: "Settings", icon: <Settings size={18} /> },
        ].map((item) => (
          <button key={item.label} type="button" className="flex items-center justify-end gap-3 px-5 py-3 text-white font-['Poppins',sans-serif] text-[14px] hover:bg-white/10">
            {item.label}
            <span className="text-white/80">{item.icon}</span>
          </button>
        ))}
        <div className="border-t border-white/20 mx-4 my-2" />
        <button type="button" onClick={() => { setMenuOpen(false); onNavigate({ screen: "home", showGuide: true, history: [] }); }} className="flex items-center justify-end px-5 py-3 text-white font-['Poppins',sans-serif] text-[14px] hover:bg-white/10">
          App Guide
        </button>
        <button type="button" className="flex items-center justify-end px-5 py-3 text-white font-['Poppins',sans-serif] text-[14px] hover:bg-white/10">
          Contact Us
        </button>
        <button type="button" onClick={() => { setMenuOpen(false); onNavigate({ screen: "faqs", history: [] }); }} className="flex items-center justify-end px-5 py-3 text-white font-['Poppins',sans-serif] text-[14px] hover:bg-white/10">
          FAQs
        </button>
        <div className="flex-1" />
        <div className="border-t border-white/20 mx-4 mb-3" />
        <button
          type="button"
          onClick={() => { setMenuOpen(false); setLogoutConfirm(true); }}
          className="flex items-center gap-2 px-5 pb-8 text-white font-['Poppins',sans-serif] font-normal text-[14px] hover:bg-white/10"
        >
          Log Out
          <LogOut size={18} stroke="white" />
        </button>
      </div>

      {logoutConfirm && (
        <LogoutConfirmModal
          onConfirm={() => { setLogoutConfirm(false); onNavigate({ screen: "login", history: [] }); }}
          onCancel={() => setLogoutConfirm(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ Screen
// ─────────────────────────────────────────────────────────────────────────────

const FAQ_DATA = [
  {
    id: "general",
    category: "General Questions",
    questions: [
      { q: "What is the Superkalan Gaz app?", a: "The app allows customers to order LPG, track delivery updates, view purchase history, and submit feedback digitally." },
      { q: "Can I use the app anytime?", a: "Yes, but deliveries are only processed during branch operating hours." },
      { q: "Do I need internet access to use the app?", a: "Yes. An internet connection is required to place orders and receive updates." },
      { q: "Can I use my account on another phone?", a: "Yes. You can log in using your registered account credentials." },
    ],
  },
  {
    id: "ordering",
    category: "Ordering & Delivery",
    questions: [
      { q: "How do I place an LPG order?", a: "Open the app, choose your LPG product, confirm your address, and submit the order." },
      { q: "How will I know if my order has been confirmed?", a: "You will receive an in-app order status update once the branch accepts your order." },
      { q: "Can I track my delivery?", a: "Yes. You can monitor delivery updates such as Order Confirmed, Out for Delivery, and Delivered." },
      { q: "Can I see the rider's live location?", a: "No. The app only provides delivery status updates." },
      { q: "What should I do if my order is delayed?", a: "You may check the app for updates or contact the branch for assistance." },
    ],
  },
  {
    id: "account",
    category: "Account & Profile",
    questions: [
      { q: "Can I save multiple delivery addresses?", a: "Yes. Multiple addresses can be saved in your profile for easier ordering." },
      { q: "Can I view my previous orders?", a: "Yes. Your purchase history is available in the app." },
      { q: "Is my personal information secure?", a: "Yes. Customer information is protected and only accessible to authorized personnel." },
    ],
  },
  {
    id: "loyalty",
    category: "Loyalty & Rewards",
    questions: [
      { q: "Does the app include a loyalty rewards program?", a: "Yes. The system automatically tracks your completed LPG purchases." },
      { q: "How do I qualify for a loyalty reward?", a: "The app counts your purchases and notifies the branch once you reach the required number of orders." },
      { q: "How will I know if I earned a reward?", a: "The branch will be notified by the system and will process the reward approval." },
    ],
  },
  {
    id: "feedback",
    category: "Feedback & Support",
    questions: [
      { q: "How can I rate my delivery experience?", a: "After delivery completion, the app will ask you to submit a star rating and feedback." },
      { q: "What is the purpose of the customer rating system?", a: "Ratings help improve delivery service quality and customer satisfaction." },
      { q: "Who can I contact if I experience problems with the app or delivery?", a: "You may contact the branch support team for assistance with technical or delivery concerns." },
    ],
  },
];

function FaqScreen({ onNavigate }: { nav: NavState; onNavigate: (updates: Partial<NavState>) => void }) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const chevronPath = faqSvgPaths.pcc10c80;

  const filtered = FAQ_DATA.map((cat) => ({
    ...cat,
    questions: cat.questions.filter(
      (item) =>
        search === "" ||
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => search === "" || cat.questions.length > 0);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative" style={{ background: "#007bc1" }}>
      {/* Header */}
      <div className="shrink-0 px-5 pt-12 pb-4 flex items-center gap-3">
        <button type="button" onClick={() => onNavigate({ screen: "home", history: [] })} className="text-white p-1">
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="font-['Poppins',sans-serif] font-bold text-[20px] text-white leading-tight flex-1">
          Frequently Asked Questions
        </h1>
      </div>

      {/* White card */}
      <div className="flex-1 bg-white overflow-hidden mx-0" style={{ borderRadius: "20px 20px 0 0" }}>
        {/* Search */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-[8px]" style={{ background: "#f0f4f7" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="#9aa8b2" strokeWidth="1.4" />
              <path d="M11.5 11.5L14 14" stroke="#9aa8b2" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent font-['Poppins',sans-serif] text-[13px] text-[#002540] placeholder-[#9aa8b2] outline-none"
            />
          </div>
        </div>

        {/* Accordion list */}
        <div className="overflow-y-auto h-full pb-24 px-4 [&::-webkit-scrollbar]:hidden flex flex-col gap-2">
          {filtered.map((cat) => {
            const catOpen = openCategory === cat.id;
            return (
              <div key={cat.id} className="flex flex-col">
                {/* Category header */}
                <button
                  type="button"
                  onClick={() => {
                    setOpenCategory(catOpen ? null : cat.id);
                    setOpenQuestion(null);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-[6.584px] text-white font-['Poppins',sans-serif] font-bold"
                  style={{ background: "#007bc1", minHeight: "46.335px", fontSize: "13.167px" }}
                >
                  <span>{cat.category}</span>
                  <svg
                    width="11.1099" height="6.17217"
                    viewBox="0 0 11.1099 6.17217"
                    fill="none"
                    className="shrink-0 transition-transform duration-200"
                    style={{ transform: catOpen ? "rotate(0deg)" : "rotate(180deg)" }}
                  >
                    <path d={chevronPath} stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* Questions */}
                {catOpen && (
                  <div className="flex flex-col mt-1 gap-1">
                    {cat.questions.map((item) => {
                      const qKey = `${cat.id}-${item.q}`;
                      const qOpen = openQuestion === qKey;
                      return (
                        <div key={qKey} className="rounded-[6.584px] overflow-hidden border" style={{ borderColor: "#d9d9d9" }}>
                          <button
                            type="button"
                            onClick={() => setOpenQuestion(qOpen ? null : qKey)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-white font-['Poppins',sans-serif] font-medium text-left"
                            style={{ minHeight: "46.335px", fontSize: "13.167px", color: "#002540" }}
                          >
                            <span className="flex-1 pr-2">{item.q}</span>
                            <svg
                              width="11.1099" height="6.17217"
                              viewBox="0 0 11.1099 6.17217"
                              fill="none"
                              className="shrink-0 transition-transform duration-200"
                              style={{ transform: qOpen ? "rotate(0deg)" : "rotate(180deg)" }}
                            >
                              <path d={chevronPath} stroke="#007bc1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          {qOpen && (
                            <div className="px-4 py-3 border-t" style={{ borderColor: "#ededed", background: "#fafafa" }}>
                              <p className="font-['Poppins',sans-serif] text-[12px] leading-relaxed" style={{ color: "#2a2f3b" }}>
                                {item.a}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="font-['Poppins',sans-serif] text-[14px] text-[#9aa8b2]">No results found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [nav, setNav] = useState<NavState>({
    screen: "login",
    loginAccount: "household",
    loginInput: "email",
    signupAccount: "household",
    signupInput: "email",
    otpVariant: "email",
    history: [],
  });

  const onNavigate = useCallback((updates: Partial<NavState>) => {
    setNav((prev) => ({ ...prev, ...updates }));
  }, []);

  const renderScreen = () => {
    switch (nav.screen) {
      case "login":
        return <LoginScreen nav={nav} onNavigate={onNavigate} />;
      case "signup":
        return <SignUpScreen nav={nav} onNavigate={onNavigate} />;
      case "otp":
        return <OtpScreen nav={nav} onNavigate={onNavigate} />;
      case "forgot":
        return <ForgotPasswordScreen nav={nav} onNavigate={onNavigate} />;
      case "forgot-check":
        return <ForgotCheckEmailScreen nav={nav} onNavigate={onNavigate} />;
      case "set-password":
        return <SetPasswordScreen nav={nav} onNavigate={onNavigate} />;
      case "success":
        return <SuccessScreen onNavigate={onNavigate} />;
      case "home":
        return <HomeScreen nav={nav} onNavigate={onNavigate} />;
      case "orders":
        return <OrdersScreen nav={nav} onNavigate={onNavigate} />;
      case "profile":
        return <ProfileScreen nav={nav} onNavigate={onNavigate} />;
      case "order-process":
        return <OrderProcessScreen nav={nav} onNavigate={onNavigate} />;
      case "faqs":
        return <FaqScreen nav={nav} onNavigate={onNavigate} />;
      default:
        return <LoginScreen nav={nav} onNavigate={onNavigate} />;
    }
  };

  return (
    <div className="w-screen h-dvh bg-white flex flex-col overflow-hidden m-0 p-0">
      {renderScreen()}
    </div>
  );
}
