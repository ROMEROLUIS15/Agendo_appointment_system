"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export type Country = {
  code: string;
  flag: string;
  name: string;
  dial: string;
  placeholder: string;
};

export const COUNTRIES: Country[] = [
  { code: 'VE', flag: '🇻🇪', name: 'Venezuela',       dial: '+58',   placeholder: '412 000 0000'   },
  { code: 'CO', flag: '🇨🇴', name: 'Colombia',        dial: '+57',   placeholder: '300 123 4567'   },
  { code: 'MX', flag: '🇲🇽', name: 'México',          dial: '+52',   placeholder: '55 1234 5678'   },
  { code: 'US', flag: '🇺🇸', name: 'Estados Unidos',  dial: '+1',    placeholder: '212 555 1234'   },
  { code: 'AR', flag: '🇦🇷', name: 'Argentina',       dial: '+54',   placeholder: '11 2345 6789'   },
  { code: 'CL', flag: '🇨🇱', name: 'Chile',           dial: '+56',   placeholder: '9 8765 4321'    },
  { code: 'PE', flag: '🇵🇪', name: 'Perú',            dial: '+51',   placeholder: '912 345 678'    },
  { code: 'EC', flag: '🇪🇨', name: 'Ecuador',         dial: '+593',  placeholder: '99 123 4567'    },
  { code: 'UY', flag: '🇺🇾', name: 'Uruguay',         dial: '+598',  placeholder: '91 234 567'     },
  { code: 'BO', flag: '🇧🇴', name: 'Bolivia',         dial: '+591',  placeholder: '7 123 4567'     },
  { code: 'PY', flag: '🇵🇾', name: 'Paraguay',        dial: '+595',  placeholder: '981 234 567'    },
  { code: 'ES', flag: '🇪🇸', name: 'España',          dial: '+34',   placeholder: '612 345 678'    },
  { code: 'BR', flag: '🇧🇷', name: 'Brasil',          dial: '+55',   placeholder: '11 91234 5678'  },
  { code: 'PA', flag: '🇵🇦', name: 'Panamá',          dial: '+507',  placeholder: '6123 4567'      },
  { code: 'DO', flag: '🇩🇴', name: 'Rep. Dominicana', dial: '+1809', placeholder: '809 123 4567'   },
];

export function parsePhone(phone: string | null | undefined): { country: Country; local: string } {
  const defaultCountry = COUNTRIES[0] as Country;
  if (!phone) return { country: defaultCountry, local: "" };

  const found = COUNTRIES.find((c) => phone.startsWith(c.dial + " ") || phone.startsWith(c.dial));
  if (found) {
    const local = phone.replace(found.dial, "").trim();
    return { country: found, local };
  }
  return { country: defaultCountry, local: phone };
}

interface PhoneInputFlagsProps {
  country: Country;
  onCountryChange: (country: Country) => void;
  localPhone: string;
  onLocalPhoneChange: (val: string) => void;
}

export function PhoneInputFlags({
  country,
  onCountryChange,
  localPhone,
  onLocalPhoneChange,
}: PhoneInputFlagsProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1.5 h-full px-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "#212125",
              border: "1px solid #2E2E33",
              color: "#F2F2F2",
              minWidth: "90px",
              boxShadow: open ? "0 0 0 2px rgba(0,98,255,0.3)" : "none",
            }}
          >
            <span className="text-lg leading-none">{country.flag}</span>
            <span style={{ color: "#4D83FF", fontSize: "12px", fontWeight: 700 }}>
              {country.dial}
            </span>
            <ChevronDown
              size={12}
              style={{
                color: "#909098",
                transform: open ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            />
          </button>

          {open && (
            <div
              className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden overflow-y-auto"
              style={{
                background: "#1A1A1F",
                border: "1px solid #2E2E33",
                boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
                maxHeight: "240px",
                minWidth: "220px",
              }}
            >
              {COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onCountryChange(c);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-white/5"
                  style={{
                    background:
                      country.code === c.code ? "rgba(0,98,255,0.1)" : "transparent",
                    color: country.code === c.code ? "#4D83FF" : "#F2F2F2",
                  }}
                >
                  <span className="text-xl leading-none">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span
                    className="text-xs font-bold flex-shrink-0"
                    style={{ color: "#4D83FF" }}
                  >
                    {c.dial}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <input
          type="tel"
          value={localPhone}
          onChange={(e) => onLocalPhoneChange(e.target.value)}
          className="input-base flex-1"
          placeholder={country.placeholder}
        />
      </div>
      <p className="text-xs mt-1" style={{ color: "#6A6A72" }}>
        Se guardará como: {country.dial} {localPhone || country.placeholder}
      </p>
    </div>
  );
}
