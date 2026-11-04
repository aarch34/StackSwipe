
import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        headline: ['var(--font-pixel)', 'var(--font-body)', 'sans-serif'],
        label: ['var(--font-label)', 'var(--font-pixel)', 'monospace'],
        code: ['monospace'],
      },
      colors: {
        // Hard-coded Tailwind colours across the app resolve to the StackSwipe palette.
        ...{"slate":{"50":"#FFF4E8","100":"#F7E6DC","200":"#E8D3CB","300":"#D2B7B5","400":"#BBA0A0","500":"#A18186","600":"#6E5056","700":"#533A43","800":"#3F2A33","900":"#321C27","950":"#21121A"},"gray":{"50":"#FFF4E8","100":"#F7E6DC","200":"#E8D3CB","300":"#D2B7B5","400":"#BBA0A0","500":"#A18186","600":"#6E5056","700":"#533A43","800":"#3F2A33","900":"#321C27","950":"#21121A"},"zinc":{"50":"#FFF4E8","100":"#F7E6DC","200":"#E8D3CB","300":"#D2B7B5","400":"#BBA0A0","500":"#A18186","600":"#6E5056","700":"#533A43","800":"#3F2A33","900":"#321C27","950":"#21121A"},"neutral":{"50":"#FFF4E8","100":"#F7E6DC","200":"#E8D3CB","300":"#D2B7B5","400":"#BBA0A0","500":"#A18186","600":"#6E5056","700":"#533A43","800":"#3F2A33","900":"#321C27","950":"#21121A"},"stone":{"50":"#FFF4E8","100":"#F7E6DC","200":"#E8D3CB","300":"#D2B7B5","400":"#BBA0A0","500":"#A18186","600":"#6E5056","700":"#533A43","800":"#3F2A33","900":"#321C27","950":"#21121A"},"emerald":{"50":"#EAFBEF","100":"#CFF6D9","200":"#A3EDB5","300":"#6FE08C","400":"#48D06B","500":"#2FB84A","600":"#259A3C","700":"#1F7C32","800":"#1B632B","900":"#174F24","950":"#0B2B13"},"green":{"50":"#EAFBEF","100":"#CFF6D9","200":"#A3EDB5","300":"#6FE08C","400":"#48D06B","500":"#2FB84A","600":"#259A3C","700":"#1F7C32","800":"#1B632B","900":"#174F24","950":"#0B2B13"},"teal":{"50":"#EAFBEF","100":"#CFF6D9","200":"#A3EDB5","300":"#6FE08C","400":"#48D06B","500":"#2FB84A","600":"#259A3C","700":"#1F7C32","800":"#1B632B","900":"#174F24","950":"#0B2B13"},"lime":{"50":"#EAFBEF","100":"#CFF6D9","200":"#A3EDB5","300":"#6FE08C","400":"#48D06B","500":"#2FB84A","600":"#259A3C","700":"#1F7C32","800":"#1B632B","900":"#174F24","950":"#0B2B13"},"sky":{"50":"#F4F0FC","100":"#E7DFF8","200":"#D2C4F2","300":"#B7A1E8","400":"#9C80DC","500":"#8463CF","600":"#7A56BD","700":"#64449E","800":"#503680","900":"#3F2B65","950":"#271A40"},"blue":{"50":"#F4F0FC","100":"#E7DFF8","200":"#D2C4F2","300":"#B7A1E8","400":"#9C80DC","500":"#8463CF","600":"#7A56BD","700":"#64449E","800":"#503680","900":"#3F2B65","950":"#271A40"},"cyan":{"50":"#F4F0FC","100":"#E7DFF8","200":"#D2C4F2","300":"#B7A1E8","400":"#9C80DC","500":"#8463CF","600":"#7A56BD","700":"#64449E","800":"#503680","900":"#3F2B65","950":"#271A40"},"indigo":{"50":"#F4F0FC","100":"#E7DFF8","200":"#D2C4F2","300":"#B7A1E8","400":"#9C80DC","500":"#8463CF","600":"#7A56BD","700":"#64449E","800":"#503680","900":"#3F2B65","950":"#271A40"},"purple":{"50":"#F4F0FC","100":"#E7DFF8","200":"#D2C4F2","300":"#B7A1E8","400":"#9C80DC","500":"#8463CF","600":"#7A56BD","700":"#64449E","800":"#503680","900":"#3F2B65","950":"#271A40"},"violet":{"50":"#F4F0FC","100":"#E7DFF8","200":"#D2C4F2","300":"#B7A1E8","400":"#9C80DC","500":"#8463CF","600":"#7A56BD","700":"#64449E","800":"#503680","900":"#3F2B65","950":"#271A40"},"amber":{"50":"#FFFBE6","100":"#FFF4BF","200":"#FFEB8A","300":"#FFE25C","400":"#FFD83F","500":"#F2C21C","600":"#CC9C0A","700":"#9C7508","800":"#7A5B0B","900":"#5C450C","950":"#332605"},"yellow":{"50":"#FFFBE6","100":"#FFF4BF","200":"#FFEB8A","300":"#FFE25C","400":"#FFD83F","500":"#F2C21C","600":"#CC9C0A","700":"#9C7508","800":"#7A5B0B","900":"#5C450C","950":"#332605"},"orange":{"50":"#FFF1EB","100":"#FFDFD2","200":"#FFBFA6","300":"#FF9A78","400":"#FA7A50","500":"#F2572B","600":"#D8451C","700":"#B03614","800":"#8A2C13","900":"#6E2713","950":"#3B1208"},"red":{"50":"#FEF0EB","100":"#FDDDD2","200":"#FBBBA6","300":"#F89A7E","400":"#F47A58","500":"#E8502A","600":"#C93A14","700":"#A32E10","800":"#82270F","900":"#6A2410","950":"#3A0F05"},"rose":{"50":"#FFF0F4","100":"#FFE0E8","200":"#FFC4D2","300":"#FFA3B9","400":"#FF7A9A","500":"#F55C84","600":"#DB3D6A","700":"#B52C54","800":"#932646","900":"#78223C","950":"#440E1E"},"pink":{"50":"#FFF0F4","100":"#FFE0E8","200":"#FFC4D2","300":"#FFA3B9","400":"#FF7A9A","500":"#F55C84","600":"#DB3D6A","700":"#B52C54","800":"#932646","900":"#78223C","950":"#440E1E"},"fuchsia":{"50":"#FFF0F4","100":"#FFE0E8","200":"#FFC4D2","300":"#FFA3B9","400":"#FF7A9A","500":"#F55C84","600":"#DB3D6A","700":"#B52C54","800":"#932646","900":"#78223C","950":"#440E1E"}},
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {"none":"0px","sm":"0px","DEFAULT":"0px","md":"0px","lg":"0px","xl":"0px","2xl":"0px","3xl":"0px","full":"0px"},
      backdropBlur: {"none":"0px","sm":"0px","DEFAULT":"0px","md":"0px","lg":"0px","xl":"0px","2xl":"0px","3xl":"0px"},
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'pulse-bg': {
          '0%, 100%': {
            transform: 'scale(1)',
            opacity: '0.2',
          },
          '50%': {
            transform: 'scale(1.1)',
            opacity: '0.3',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-bg': 'pulse-bg 8s infinite ease-in-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
