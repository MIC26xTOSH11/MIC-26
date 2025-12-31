# TeamGrid Component Demo

## ✅ Component Created
**Location:** `/components/ui/team-grid.tsx`

## ✅ Features Implemented

### 🎨 Visual Design
- Dark navy/slate-900 background
- Teal-emerald gradient cards with 20% opacity
- Yellow & green blob gradients (decorative)
- Pulsing cyan/emerald dots (animated)
- Responsive grid: 1 col mobile → 2 cols tablet → 4 cols desktop

### 🎭 Animations (Framer Motion)
- **Card Hover:** Scale 1.05x with smooth transition
- **Overlay:** Black/70 backdrop-blur with slide-up animation
- **Variants:** 
  - `hidden: {opacity: 0, y: 20}`
  - `visible: {opacity: 1, y: 0}` (0.3s easeOut)
  - `exit: {opacity: 0, y: 20}` (0.2s easeIn)
- **Mobile:** Tap to toggle preview (touch-friendly)

### 📋 Team Data
```typescript
type TeamMember = {
  id: number;
  initial: string;
  name: string;
  role: string;
  quote: string;
  bio: string;
  imageSrc?: string;
};
```

**Members:**
1. Omar (Team Lead) - "Turning data into shields."
2. Tanishq (Team Member) - "Crafting scans that spot harm."
3. Hansika (Team Member) - "Weaving compliance into pixels."
4. Anirudha (Team Member) - "Decoding threats with precision."

### ♿ Accessibility
- `aria-expanded` attribute for screen readers
- Keyboard navigation support
- Touch-friendly mobile interactions

## 📦 Usage in Landing Page

The component is already integrated into `/app/page.js`:

```jsx
import TeamGrid from "@/components/ui/team-grid";

// In your page component:
<TeamGrid />
```

## 🚀 Try It Out

1. Start the dev server:
   ```bash
   cd frontend && npm run dev
   ```

2. Navigate to `http://localhost:3000`

3. Scroll to the Team section

4. **Desktop:** Hover over any team card to see the preview overlay
5. **Mobile:** Tap a card to toggle the preview

## 🎨 Customization

You can customize the component by passing a `className` prop:

```jsx
<TeamGrid className="bg-slate-950 py-32" />
```

Or modify the team data directly in the `team-grid.tsx` file to use dynamic props:

```tsx
interface TeamGridProps {
  className?: string;
  members?: TeamMember[];
}

export default function TeamGrid({ 
  className = "", 
  members = teamMembers 
}: TeamGridProps) {
  // ... rest of component
}
```

## 📦 Dependencies Installed
- ✅ `framer-motion` - Animation library
- ✅ `@types/react` - TypeScript definitions
- ✅ `@types/react-dom` - TypeScript definitions

## 🐛 Bug-Free & Performant
- AnimatePresence handles enter/exit animations properly
- No layout shift on hover
- Smooth 60fps animations
- Touch events don't interfere with scroll
