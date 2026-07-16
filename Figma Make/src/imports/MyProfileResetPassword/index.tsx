import svgPaths from "./svg-5mkn9dqps4";
import imgImage2 from "./7149799d6c90935dba9a70aa87d1ff5a031b798c.png";

function VuesaxBoldHome() {
  return (
    <div className="absolute contents inset-0" data-name="vuesax/bold/home-2">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="home-2">
          <path d={svgPaths.p37a1e000} fill="var(--fill-0, #9DB2CE)" id="Vector" />
          <path d="M0 24L24 24L24 0L0 0L0 24Z" fill="var(--fill-0, #9DB2CE)" id="Vector_2" opacity="0" />
        </g>
      </svg>
    </div>
  );
}

function NavigationMenuHome() {
  return (
    <div className="content-stretch flex flex-col gap-[5px] h-[61px] items-center px-[15px] py-[12.5px] relative shrink-0 w-[70px]" data-name="navigation/menu - home">
      <div className="relative shrink-0 size-[24px]" data-name="home">
        <VuesaxBoldHome />
      </div>
      <p className="[word-break:break-word] font-['SF_Pro_Text:Medium',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#9db2ce] text-[12px] whitespace-nowrap">Home</p>
    </div>
  );
}

function LucideGift() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="lucide/gift">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="lucide/gift">
          <path d={svgPaths.p22c58184} id="Vector" stroke="var(--stroke-0, #9DB2CE)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function NavigationMenuHome1() {
  return (
    <div className="content-stretch flex flex-col gap-[5px] h-[61px] items-center px-[15px] py-[12.5px] relative shrink-0 w-[70px]" data-name="navigation/menu - home">
      <LucideGift />
      <p className="[word-break:break-word] font-['SF_Pro:Medium',sans-serif] font-[510] leading-[normal] relative shrink-0 text-[#9db2ce] text-[12px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Rewards
      </p>
    </div>
  );
}

function NavigationMenuLeft() {
  return (
    <div className="content-stretch flex gap-[18px] items-start relative shrink-0" data-name="navigation/menu - left">
      <NavigationMenuHome />
      <NavigationMenuHome1 />
    </div>
  );
}

function VuesaxLinearBag() {
  return (
    <div className="absolute contents inset-0" data-name="vuesax/linear/bag">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="bag">
          <path d="M8.81 2L5.19 5.63" id="Vector" stroke="var(--stroke-0, #007BC1)" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" />
          <path d="M15.19 2L18.81 5.63" id="Vector_2" stroke="var(--stroke-0, #007BC1)" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" />
          <path d={svgPaths.p298cd600} id="Vector_3" stroke="var(--stroke-0, #007BC1)" strokeWidth="1.5" />
          <path d="M9.76 14V17.55" id="Vector_4" stroke="var(--stroke-0, #007BC1)" strokeLinecap="round" strokeWidth="1.5" />
          <path d="M14.36 14V17.55" id="Vector_5" stroke="var(--stroke-0, #007BC1)" strokeLinecap="round" strokeWidth="1.5" />
          <path d={svgPaths.p3216aa00} id="Vector_6" stroke="var(--stroke-0, #007BC1)" strokeLinecap="round" strokeWidth="1.5" />
          <g id="Vector_7" opacity="0" />
        </g>
      </svg>
    </div>
  );
}

function NavigationMenuHome2() {
  return (
    <div className="content-stretch flex flex-col gap-[5px] h-[61px] items-center px-[15px] py-[12.5px] relative shrink-0 w-[70px]" data-name="navigation/menu - home">
      <div className="relative shrink-0 size-[24px]" data-name="cart">
        <VuesaxLinearBag />
      </div>
      <p className="[word-break:break-word] font-['SF_Pro:Medium',sans-serif] font-[510] leading-[normal] relative shrink-0 text-[#007bc1] text-[12px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Orders
      </p>
    </div>
  );
}

function VuesaxLinearUser() {
  return (
    <div className="absolute contents inset-0" data-name="vuesax/linear/user">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="user">
          <path d={svgPaths.pae7b400} id="Vector" stroke="var(--stroke-0, #9DB2CE)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <path d={svgPaths.p1b59ca60} id="Vector_2" stroke="var(--stroke-0, #9DB2CE)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <path d="M23.5 0.5V23.5H0.5V0.5H23.5Z" id="Vector_3" opacity="0" stroke="var(--stroke-0, #9DB2CE)" />
        </g>
      </svg>
    </div>
  );
}

function NavigationMenuHome3() {
  return (
    <div className="content-stretch flex flex-col gap-[5px] h-[61px] items-center px-[15px] py-[12.5px] relative shrink-0 w-[70px]" data-name="navigation/menu - home">
      <div className="relative shrink-0 size-[24px]" data-name="user">
        <VuesaxLinearUser />
      </div>
      <p className="[word-break:break-word] font-['SF_Pro_Text:Medium',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#9db2ce] text-[12px] whitespace-nowrap">Profile</p>
    </div>
  );
}

function NavigationMenuRight() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0" data-name="navigation/menu - right">
      <NavigationMenuHome2 />
      <NavigationMenuHome3 />
    </div>
  );
}

function Group() {
  return (
    <div className="absolute contents left-[32.17px] top-[37px]">
      <div className="-translate-x-1/2 -translate-y-1/2 [word-break:break-word] absolute flex flex-col font-['Poppins:Bold',sans-serif] h-[19px] justify-center leading-[0] left-[103.5px] not-italic text-[12px] text-center text-white top-[46.5px] w-[142.659px]">
        <p className="leading-[normal]">YES, LOG ME OUT</p>
      </div>
      <div className="absolute h-[14px] left-[67.7px] overflow-clip top-[40px] w-[7.425px]" data-name="Send" />
    </div>
  );
}

function Group7() {
  return (
    <div className="absolute contents left-[3px] top-[28px]">
      <div className="absolute bg-[#007bc1] h-[38px] left-[3px] rounded-[8px] top-[28px] w-[200.996px]" />
      <Group />
    </div>
  );
}

function Frame() {
  return (
    <div className="-translate-x-1/2 absolute bg-[#007bc1] left-[calc(50%-0.5px)] rounded-[50px] size-[55px] top-[-16px]">
      <div className="absolute h-[37px] left-[15px] top-[9px] w-[26px]" data-name="image 2">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage2} />
      </div>
      <Group7 />
    </div>
  );
}

function Frame2() {
  return (
    <div className="absolute content-stretch flex h-[68px] items-center justify-between left-0 px-[25px] right-0 rounded-tl-[32px] rounded-tr-[22px] top-[32px]">
      <NavigationMenuLeft />
      <NavigationMenuRight />
      <Frame />
    </div>
  );
}

function VuesaxBoldHome1() {
  return (
    <div className="absolute contents inset-0" data-name="vuesax/bold/home-2">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="home-2">
          <path d={svgPaths.p37a1e000} fill="var(--fill-0, #9DB2CE)" id="Vector" />
          <path d="M0 24L24 24L24 0L0 0L0 24Z" fill="var(--fill-0, #9DB2CE)" id="Vector_2" opacity="0" />
        </g>
      </svg>
    </div>
  );
}

function NavigationMenuHome4() {
  return (
    <div className="content-stretch flex flex-col gap-[5px] h-[61px] items-center px-[15px] py-[12.5px] relative shrink-0 w-[70px]" data-name="navigation/menu - home">
      <div className="relative shrink-0 size-[24px]" data-name="home">
        <VuesaxBoldHome1 />
      </div>
      <p className="[word-break:break-word] font-['SF_Pro_Text:Medium',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#9db2ce] text-[12px] whitespace-nowrap">Home</p>
    </div>
  );
}

function LucideGift1() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="lucide/gift">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="lucide/gift">
          <path d={svgPaths.p22c58184} id="Vector" stroke="var(--stroke-0, #9DB2CE)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function NavigationMenuHome5() {
  return (
    <div className="content-stretch flex flex-col gap-[5px] h-[61px] items-center px-[15px] py-[12.5px] relative shrink-0 w-[70px]" data-name="navigation/menu - home">
      <LucideGift1 />
      <p className="[word-break:break-word] font-['SF_Pro:Medium',sans-serif] font-[510] leading-[normal] relative shrink-0 text-[#9db2ce] text-[12px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Rewards
      </p>
    </div>
  );
}

function NavigationMenuLeft1() {
  return (
    <div className="content-stretch flex gap-[18px] items-start relative shrink-0" data-name="navigation/menu - left">
      <NavigationMenuHome4 />
      <NavigationMenuHome5 />
    </div>
  );
}

function VuesaxLinearBag1() {
  return (
    <div className="absolute contents inset-0" data-name="vuesax/linear/bag">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="bag">
          <path d="M8.81 2L5.19 5.63" id="Vector" stroke="var(--stroke-0, #9DB2CE)" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" />
          <path d="M15.19 2L18.81 5.63" id="Vector_2" stroke="var(--stroke-0, #9DB2CE)" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" />
          <path d={svgPaths.p298cd600} id="Vector_3" stroke="var(--stroke-0, #9DB2CE)" strokeWidth="1.5" />
          <path d="M9.76 14V17.55" id="Vector_4" stroke="var(--stroke-0, #9DB2CE)" strokeLinecap="round" strokeWidth="1.5" />
          <path d="M14.36 14V17.55" id="Vector_5" stroke="var(--stroke-0, #9DB2CE)" strokeLinecap="round" strokeWidth="1.5" />
          <path d={svgPaths.p3216aa00} id="Vector_6" stroke="var(--stroke-0, #9DB2CE)" strokeLinecap="round" strokeWidth="1.5" />
          <g id="Vector_7" opacity="0" />
        </g>
      </svg>
    </div>
  );
}

function NavigationMenuHome6() {
  return (
    <div className="content-stretch flex flex-col gap-[5px] h-[61px] items-center px-[15px] py-[12.5px] relative shrink-0 w-[70px]" data-name="navigation/menu - home">
      <div className="relative shrink-0 size-[24px]" data-name="cart">
        <VuesaxLinearBag1 />
      </div>
      <p className="[word-break:break-word] font-['SF_Pro:Medium',sans-serif] font-[510] leading-[normal] relative shrink-0 text-[#9db2ce] text-[12px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Orders
      </p>
    </div>
  );
}

function VuesaxLinearUser1() {
  return (
    <div className="absolute contents inset-0" data-name="vuesax/linear/user">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="user">
          <path d={svgPaths.pae7b400} id="Vector" stroke="var(--stroke-0, #007BC1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <path d={svgPaths.p1b59ca60} id="Vector_2" stroke="var(--stroke-0, #007BC1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <path d="M23.5 0.5V23.5H0.5V0.5H23.5Z" id="Vector_3" opacity="0" stroke="var(--stroke-0, #007BC1)" />
        </g>
      </svg>
    </div>
  );
}

function NavigationMenuHome7() {
  return (
    <div className="content-stretch flex flex-col gap-[5px] h-[61px] items-center px-[15px] py-[12.5px] relative shrink-0 w-[70px]" data-name="navigation/menu - home">
      <div className="relative shrink-0 size-[24px]" data-name="user">
        <VuesaxLinearUser1 />
      </div>
      <p className="[word-break:break-word] font-['SF_Pro_Text:Medium',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#007bc1] text-[12px] whitespace-nowrap">Profile</p>
    </div>
  );
}

function NavigationMenuRight1() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0" data-name="navigation/menu - right">
      <NavigationMenuHome6 />
      <NavigationMenuHome7 />
    </div>
  );
}

function Frame1() {
  return (
    <div className="-translate-x-1/2 absolute bg-[#007bc1] left-[calc(50%-0.5px)] rounded-[50px] size-[55px] top-[-16px]">
      <div className="absolute h-[37px] left-[15px] top-[9px] w-[26px]" data-name="image 2">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage2} />
      </div>
    </div>
  );
}

function Frame3() {
  return (
    <div className="absolute content-stretch flex h-[68px] items-center justify-between left-0 px-[25px] right-0 rounded-tl-[32px] rounded-tr-[22px] top-[32px]">
      <NavigationMenuLeft1 />
      <NavigationMenuRight1 />
      <Frame1 />
    </div>
  );
}

function Profile() {
  return (
    <div className="absolute h-[119px] left-0 top-0 w-[430px]" data-name="Profile">
      <div className="absolute h-[68.199px] left-0 top-[31.8px] w-[430px]" data-name="Subtract">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 430 68.199">
          <path d={svgPaths.p22bcfe80} fill="var(--fill-0, #BEE1F7)" id="Subtract" />
        </svg>
      </div>
      <Frame3 />
    </div>
  );
}

function Orders() {
  return (
    <div className="absolute h-[119px] left-[5px] top-[849px] w-[430px]" data-name="Orders">
      <div className="absolute h-[68.199px] left-0 top-[31.8px] w-[430px]" data-name="Subtract">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 430 68.199">
          <path d={svgPaths.p22bcfe80} fill="var(--fill-0, #BEE1F7)" id="Subtract" />
        </svg>
      </div>
      <Frame2 />
      <Profile />
    </div>
  );
}

function LucideChevronLeft() {
  return (
    <div className="absolute left-[9px] size-[24px] top-[57px]" data-name="lucide/chevron-left">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="lucide/chevron-left">
          <path d="M15 18L9 12L15 6" id="Vector" stroke="var(--stroke-0, #044674)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame4() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[12px] items-start left-[59px] top-[379px] w-[330px]">
      <p className="[word-break:break-word] font-['Poppins:Medium',sans-serif] leading-none min-w-full not-italic relative shrink-0 text-[#002540] text-[10px] w-[min-content]">First Name</p>
      <div className="bg-white h-[38px] relative rounded-[10px] shrink-0 w-full">
        <div aria-hidden className="absolute border border-[#989898] border-solid inset-0 pointer-events-none rounded-[10px]" />
      </div>
      <p className="[word-break:break-word] font-['Poppins:Medium',sans-serif] leading-none min-w-full not-italic relative shrink-0 text-[#002540] text-[10px] w-[min-content]">Last Name</p>
      <div className="bg-white h-[38px] relative rounded-[10px] shrink-0 w-full">
        <div aria-hidden className="absolute border border-[#989898] border-solid inset-0 pointer-events-none rounded-[10px]" />
      </div>
      <p className="[word-break:break-word] font-['Poppins:Medium',sans-serif] leading-none min-w-full not-italic relative shrink-0 text-[#002540] text-[10px] w-[min-content]">Email (If Applicable)</p>
      <div className="bg-white h-[38px] relative rounded-[10px] shrink-0 w-full">
        <div aria-hidden className="absolute border border-[#989898] border-solid inset-0 pointer-events-none rounded-[10px]" />
      </div>
      <p className="[word-break:break-word] absolute font-['Poppins:Regular',sans-serif] h-[14px] leading-none left-[15px] not-italic text-[#044674] text-[14px] top-[34px] w-[35px]">Juan</p>
      <p className="[word-break:break-word] absolute font-['Poppins:Regular',sans-serif] h-[14px] leading-none left-[15px] not-italic text-[#044674] text-[14px] top-[106px] w-[67px]">Dela Cruz</p>
      <p className="[word-break:break-word] absolute font-['Poppins:Regular',sans-serif] h-[14px] leading-none left-[15px] not-italic text-[#044674] text-[14px] top-[177px] w-[237px]">juandelacruz@email.com</p>
      <p className="[word-break:break-word] font-['Poppins:Medium',sans-serif] leading-none min-w-full not-italic relative shrink-0 text-[#002540] text-[10px] w-[min-content]">Contact Number</p>
      <div className="bg-white h-[38px] relative rounded-[10px] shrink-0 w-full">
        <div aria-hidden className="absolute border border-[#989898] border-solid inset-0 pointer-events-none rounded-[10px]" />
      </div>
      <p className="[word-break:break-word] absolute font-['Poppins:Regular',sans-serif] h-[14px] leading-none left-[15px] not-italic text-[#044674] text-[14px] top-[250px] w-[237px]">09123456789</p>
      <p className="[word-break:break-word] font-['Poppins:Medium',sans-serif] leading-none min-w-full not-italic relative shrink-0 text-[#002540] text-[10px] w-[min-content]">Address</p>
      <div className="bg-white h-[38px] relative rounded-[10px] shrink-0 w-full">
        <div aria-hidden className="absolute border border-[#989898] border-solid inset-0 pointer-events-none rounded-[10px]" />
      </div>
      <p className="[word-break:break-word] absolute font-['Poppins:Regular',sans-serif] h-[14px] leading-none left-[11px] not-italic text-[#989898] text-[14px] top-[322px] w-[237px]">123 Main St., Metro Manila</p>
      <p className="[word-break:break-word] font-['Poppins:Medium',sans-serif] leading-none min-w-full not-italic relative shrink-0 text-[#002540] text-[10px] w-[min-content]">Password</p>
      <div className="bg-white h-[38px] relative rounded-[10px] shrink-0 w-full">
        <div aria-hidden className="absolute border border-[#989898] border-solid inset-0 pointer-events-none rounded-[10px]" />
      </div>
      <p className="[word-break:break-word] font-['Poppins:Medium',sans-serif] leading-none min-w-full not-italic relative shrink-0 text-[#007bc1] text-[10px] w-[min-content]">Reset Password</p>
      <p className="[word-break:break-word] absolute font-['Poppins:Regular',sans-serif] h-[14px] leading-none left-[11px] not-italic text-[#044674] text-[14px] top-[322px] w-[237px]">123 Main St., Metro Manila</p>
      <p className="[word-break:break-word] absolute font-['Poppins:Regular',sans-serif] h-[14px] leading-none left-[11px] not-italic text-[#044674] text-[14px] top-[394px] w-[237px]">••••••••••</p>
    </div>
  );
}

function Group4() {
  return (
    <div className="absolute contents left-[31px] top-[301px]">
      <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Poppins:SemiBold',sans-serif] leading-[normal] left-[112px] not-italic text-[#007bc1] text-[10px] text-center top-[301px] w-[122px]">Personal Details</p>
      <p className="[word-break:break-word] absolute font-['Poppins:SemiBold',sans-serif] leading-[normal] left-[268px] not-italic text-[#989898] text-[10px] top-[301px] w-[108px]">Account Preferences</p>
      <div className="absolute h-0 left-[31px] top-[319.53px] w-[379px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 379 1">
            <line id="Line 8" stroke="var(--stroke-0, #F1F1F1)" x2="379" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <div className="absolute flex h-[0.483px] items-center justify-center left-[31px] top-[319.53px] w-[189px]">
        <div className="flex-none rotate-[0.15deg]">
          <div className="h-0 relative w-[189.001px]">
            <div className="absolute inset-[-1px_0_0_0]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 189.001 1">
                <line id="Line 9" stroke="var(--stroke-0, #007BC1)" x2="189.001" y1="0.5" y2="0.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Group5() {
  return (
    <div className="absolute contents left-[253px] top-[191px]">
      <div className="absolute left-[253px] size-[30px] top-[191px]">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 30 30">
          <circle cx="15" cy="15" fill="var(--fill-0, #007BC1)" id="Ellipse 206" r="14.5" stroke="var(--stroke-0, #044674)" />
        </svg>
      </div>
      <div className="absolute left-[260px] overflow-clip size-[16px] top-[198px]" data-name="Camera">
        <div className="absolute inset-[12.5%_4.17%]" data-name="Icon">
          <div className="absolute inset-[-6.67%_-5.45%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16.2667 13.6">
              <g id="Icon">
                <path d={svgPaths.p21c85c00} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
                <path d={svgPaths.p27f30c00} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame5() {
  return (
    <div className="absolute h-[21px] left-[326px] top-[338px] w-[63px]">
      <div className="absolute bg-[#d9d9d9] h-[21px] left-0 rounded-[5px] top-0 w-[63px]" />
      <p className="[word-break:break-word] absolute font-['Poppins:Bold',sans-serif] leading-[normal] left-[31px] not-italic text-[#989898] text-[10px] top-[3px] whitespace-nowrap">EDIT</p>
      <div className="absolute left-[7px] overflow-clip size-[13px] top-[4px]" data-name="Edit">
        <div className="absolute inset-[7.83%_7.83%_8.33%_8.33%]" data-name="Icon">
          <div className="absolute inset-[-7.34%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.499 12.499">
              <path d={svgPaths.p2932dd00} id="Icon" stroke="var(--stroke-0, #989898)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function Group1() {
  return (
    <div className="absolute contents left-[253.65px] top-[905px]">
      <div className="-translate-x-1/2 -translate-y-1/2 [word-break:break-word] absolute flex flex-col font-['Poppins:Bold',sans-serif] h-[19px] justify-center leading-[0] left-[319.38px] not-italic text-[12px] text-center text-white top-[914.5px] w-[131.47px]">
        <p className="leading-[normal]">CONFIRM</p>
      </div>
      <div className="absolute h-[14px] left-[286.39px] overflow-clip top-[908px] w-[6.842px]" data-name="Send" />
    </div>
  );
}

function Group2() {
  return (
    <div className="absolute contents left-[226.77px] top-[896px]">
      <div className="absolute bg-[#007bc1] h-[38px] left-[226.77px] rounded-[8px] top-[896px] w-[185.231px]" />
      <Group1 />
    </div>
  );
}

function Group3() {
  return (
    <div className="absolute contents left-[62.88px] top-[905px]">
      <div className="-translate-x-1/2 -translate-y-1/2 [word-break:break-word] absolute flex flex-col font-['Poppins:Bold',sans-serif] h-[19px] justify-center leading-[0] left-[128.62px] not-italic text-[#989898] text-[12px] text-center top-[914.5px] w-[131.47px]">
        <p className="leading-[normal]">CANCEL</p>
      </div>
      <div className="absolute h-[14px] left-[95.63px] overflow-clip top-[908px] w-[6.842px]" data-name="Send" />
    </div>
  );
}

function Group8() {
  return (
    <div className="absolute contents left-[36px] top-[896px]">
      <div className="absolute bg-[#d9d9d9] h-[38px] left-[36px] rounded-[8px] top-[896px] w-[185.231px]" />
      <Group3 />
    </div>
  );
}

function Group6() {
  return (
    <div className="absolute contents left-[53px] top-[727px]">
      <p className="[word-break:break-word] absolute font-['Poppins:Medium',sans-serif] leading-none left-[53px] not-italic text-[#002540] text-[10px] top-[727px] w-[330px]">Current Password</p>
      <div className="absolute bg-white border border-[#989898] border-solid h-[38px] left-[53px] rounded-[10px] top-[749px] w-[330px]" />
      <div className="absolute left-[353px] overflow-clip size-[20px] top-[759px]" data-name="Eye">
        <div className="absolute inset-[16.67%_4.17%]" data-name="Icon">
          <div className="absolute inset-[-7.5%_-5.45%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20.3333 15.3333">
              <g id="Icon">
                <path d={svgPaths.p3fcaec00} stroke="var(--stroke-0, #7D7F7E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d={svgPaths.p35b28cf0} stroke="var(--stroke-0, #7D7F7E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </g>
            </svg>
          </div>
        </div>
      </div>
      <p className="[word-break:break-word] absolute font-['Poppins:Medium',sans-serif] leading-none left-[53px] not-italic text-[#002540] text-[10px] top-[799px] w-[330px]">New Password</p>
      <div className="absolute bg-white border border-[#989898] border-solid h-[38px] left-[53px] rounded-[10px] top-[821px] w-[330px]" />
      <div className="absolute left-[353px] overflow-clip size-[20px] top-[831px]" data-name="Eye">
        <div className="absolute inset-[16.67%_4.17%]" data-name="Icon">
          <div className="absolute inset-[-7.5%_-5.45%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20.3333 15.3333">
              <g id="Icon">
                <path d={svgPaths.p3fcaec00} stroke="var(--stroke-0, #7D7F7E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d={svgPaths.p35b28cf0} stroke="var(--stroke-0, #7D7F7E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function PopUp() {
  return (
    <div className="absolute contents left-px top-[655px]" data-name="Pop up">
      <div className="absolute bg-white h-[310px] left-px rounded-tl-[20px] rounded-tr-[20px] top-[655px] w-[439px]" />
      <Group2 />
      <Group8 />
      <p className="[word-break:break-word] absolute font-['Poppins:SemiBold',sans-serif] leading-[normal] left-[23px] not-italic text-[#044674] text-[20px] top-[671px] whitespace-nowrap">Password reset</p>
      <div className="absolute left-[402px] overflow-clip size-[16px] top-[676px]" data-name="X">
        <div className="absolute inset-1/4" data-name="Icon">
          <div className="absolute inset-[-10%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9.6 9.6">
              <path d={svgPaths.p307eee40} id="Icon" stroke="var(--stroke-0, #757575)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
            </svg>
          </div>
        </div>
      </div>
      <Group6 />
    </div>
  );
}

export default function MyProfileResetPassword() {
  return (
    <div className="bg-white relative size-full" data-name="My Profile - Reset Password">
      <Orders />
      <p className="[word-break:break-word] absolute font-['Poppins:SemiBold',sans-serif] leading-[normal] left-[59px] not-italic text-[#002540] text-[20px] top-[54px] whitespace-nowrap">My Profile</p>
      <LucideChevronLeft />
      <div className="absolute bg-[#007bc1] h-[161px] left-[14px] rounded-[27px] top-[107px] w-[411px]" />
      <div className="absolute bg-white h-[679px] left-[31px] rounded-[27px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] top-[168px] w-[379px]" />
      <Frame4 />
      <Group4 />
      <div className="absolute bg-[#8f9297] content-stretch drop-shadow-[0px_6px_3px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center left-[145px] p-[12px] rounded-[99999px] size-[150px] top-[81px]" data-name="avatar">
        <div aria-hidden className="absolute border-3 border-[#e0e2e6] border-solid inset-0 pointer-events-none rounded-[99999px]" />
        <div className="relative shrink-0 size-[52px]" data-name="Utility Icons (heroicons-mini)">
          <div className="absolute inset-[10%_16.9%_10%_16.93%]" data-name="vector">
            <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 34.4065 41.6">
              <g id="vector">
                <path d={svgPaths.p16947b00} fill="var(--fill-0, white)" />
                <path d={svgPaths.p2b5a3a00} fill="var(--fill-0, white)" />
              </g>
            </svg>
          </div>
        </div>
      </div>
      <p className="[word-break:break-word] absolute font-['Poppins:Bold',sans-serif] leading-[normal] left-[141px] not-italic text-[#044674] text-[20px] top-[238px] whitespace-nowrap">Juan Dela Cruz</p>
      <p className="[word-break:break-word] absolute font-['Poppins:Bold',sans-serif] leading-[normal] left-[51px] not-italic text-[#007bc1] text-[16px] top-[336px] whitespace-nowrap">Personal Details</p>
      <p className="[word-break:break-word] absolute font-['Poppins:Bold',sans-serif] leading-[normal] left-[149px] not-italic text-[#9db2ce] text-[11px] top-[268px] whitespace-nowrap">CUSTOMER ID: CUST-1234</p>
      <Group5 />
      <Frame5 />
      <div className="absolute bg-black h-[966px] left-[-22px] opacity-30 top-0 w-[462px]" />
      <PopUp />
    </div>
  );
}