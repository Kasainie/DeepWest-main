import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Hotel, BarChart3, Users, Shield, ChefHat, CalendarCheck, ArrowRight, Zap, Globe, Headphones, Star, Sparkles, BedDouble, Wine, CreditCard, Clock } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const fadeUp = { hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.12 } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.8 }, show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } };

const features = [
  { icon: Hotel, title: "Room Management", desc: "Track availability, bookings, and housekeeping in real time.", color: "from-primary/20 to-primary/5" },
  { icon: ChefHat, title: "Restaurant & Kitchen", desc: "Manage orders, menus, and kitchen workflow seamlessly.", color: "from-accent/20 to-accent/5" },
  { icon: BarChart3, title: "Sales & Analytics", desc: "Comprehensive revenue tracking with detailed reports.", color: "from-info/20 to-info/5" },
  { icon: Users, title: "Guest Management", desc: "VIP tracking, visit history, and guest profiles.", color: "from-warning/20 to-warning/5" },
  { icon: CalendarCheck, title: "Conference Booking", desc: "Schedule and manage conference rooms and events.", color: "from-success/20 to-success/5" },
  { icon: Shield, title: "Staff & Security", desc: "Role-based access with secure staff code login.", color: "from-destructive/20 to-destructive/5" },
];

const stats = [
  { value: "500+", label: "Properties", icon: BedDouble },
  { value: "50K+", label: "Bookings", icon: CalendarCheck },
  { value: "99.9%", label: "Uptime", icon: Clock },
  { value: "24/7", label: "Support", icon: Headphones },
];

// Floating animated orb component
function FloatingOrb({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl opacity-20 ${className}`}
      animate={{
        y: [0, -30, 0, 30, 0],
        x: [0, 20, 0, -20, 0],
        scale: [1, 1.1, 1, 0.9, 1],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

// Animated grid dots background
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,hsl(var(--primary)/0.08)_1px,transparent_0)] bg-[size:40px_40px]" />
    </div>
  );
}

// Floating icon that drifts around
function FloatingIcon({ icon: Icon, className, delay = 0 }: { icon: any; className?: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute ${className}`}
      animate={{
        y: [0, -15, 0, 15, 0],
        x: [0, 10, 0, -10, 0],
        rotate: [0, 5, 0, -5, 0],
      }}
      transition={{
        duration: 6 + delay,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    >
      <div className="p-3 rounded-2xl bg-card border border-border/50 shadow-card">
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  return (
    <div ref={containerRef} className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Navbar */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <motion.div
            className="flex items-center gap-2.5"
            whileHover={{ scale: 1.02 }}
          >
            <motion.div
              className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center"
              whileHover={{ rotate: 10 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Hotel className="h-5 w-5 text-primary-foreground" />
            </motion.div>
            <span className="text-xl font-bold font-display tracking-tight">LKTECH</span>
          </motion.div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="group">
                Sign In
                <motion.span className="inline-block" whileHover={{ x: 3 }}>→</motion.span>
              </Button>
            </Link>
            <Link to="/register-company">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Button size="sm" className="gap-1.5 shadow-lg shadow-primary/25">
                  Get Started <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative">
        {/* Animated background orbs */}
        <FloatingOrb className="w-96 h-96 bg-primary -top-20 -left-20" delay={0} />
        <FloatingOrb className="w-80 h-80 bg-accent top-40 right-0" delay={2} />
        <FloatingOrb className="w-64 h-64 bg-info bottom-0 left-1/3" delay={4} />
        <GridBackground />

        {/* Floating decorative icons */}
        <FloatingIcon icon={BedDouble} className="top-32 left-[8%] hidden lg:block" delay={0} />
        <FloatingIcon icon={Wine} className="top-48 right-[10%] hidden lg:block" delay={1.5} />
        <FloatingIcon icon={CreditCard} className="bottom-20 left-[15%] hidden lg:block" delay={3} />
        <FloatingIcon icon={Star} className="top-24 right-[25%] hidden lg:block" delay={2} />
        <FloatingIcon icon={Sparkles} className="bottom-32 right-[8%] hidden lg:block" delay={0.5} />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10"
        >
          <motion.section
            variants={stagger}
            initial="hidden"
            animate="show"
            className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center"
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20"
              whileHover={{ scale: 1.05, backgroundColor: "hsl(var(--primary) / 0.15)" }}
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Zap className="h-3.5 w-3.5" />
              </motion.div>
              Hospitality Management, Simplified
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl lg:text-7xl font-bold font-display leading-[1.1] tracking-tight max-w-4xl mx-auto">
              Run your property{" "}
              <span className="relative inline-block">
                <span className="text-primary">smarter</span>
                <motion.span
                  className="absolute -bottom-2 left-0 right-0 h-3 bg-primary/15 rounded-full -z-10"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.8, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
              , not harder
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The all-in-one platform for hotels, restaurants, and hospitality businesses.
              Manage rooms, orders, staff, and finances — all from one dashboard.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register-company">
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button size="lg" className="text-base px-8 gap-2 h-12 shadow-xl shadow-primary/30">
                    Start Free <ArrowRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              </Link>
              <Link to="/login">
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button variant="outline" size="lg" className="text-base px-8 h-12">
                    Sign In
                  </Button>
                </motion.div>
              </Link>
            </motion.div>

            {/* Animated dashboard mockup */}
            <motion.div
              variants={fadeUp}
              className="mt-16 relative mx-auto max-w-4xl"
            >
              <motion.div
                className="rounded-2xl border border-border/60 bg-card p-2 shadow-elevated overflow-hidden"
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                {/* Mock browser bar */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 rounded-t-xl border-b border-border/40">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-destructive/60" />
                    <div className="w-3 h-3 rounded-full bg-warning/60" />
                    <div className="w-3 h-3 rounded-full bg-success/60" />
                  </div>
                  <div className="flex-1 mx-8">
                    <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground text-center border border-border/40">
                      lktech.life/dashboard
                    </div>
                  </div>
                </div>
                {/* Mock dashboard content */}
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Revenue", value: "KSH 284,500", change: "+12.5%", color: "bg-primary/10 text-primary" },
                      { label: "Bookings", value: "142", change: "+8.2%", color: "bg-accent/10 text-accent" },
                      { label: "Occupancy", value: "87%", change: "+3.1%", color: "bg-info/10 text-info" },
                      { label: "Guests", value: "56", change: "+15.4%", color: "bg-success/10 text-success" },
                    ].map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        className="rounded-xl border border-border/40 bg-background p-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2 + i * 0.15, duration: 0.5 }}
                      >
                        <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                        <div className="text-sm font-bold mt-0.5">{stat.value}</div>
                        <div className={`text-[10px] font-medium mt-0.5 inline-flex px-1.5 py-0.5 rounded-full ${stat.color}`}>
                          {stat.change}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {/* Mock chart bars */}
                  <div className="rounded-xl border border-border/40 bg-background p-4">
                    <div className="text-xs font-medium mb-3">Weekly Revenue</div>
                    <div className="flex items-end gap-2 h-24">
                      {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                        <motion.div
                          key={i}
                          className="flex-1 bg-primary/20 rounded-t-md relative overflow-hidden"
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ delay: 1.8 + i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <motion.div
                            className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-md"
                            initial={{ height: 0 }}
                            animate={{ height: "100%" }}
                            transition={{ delay: 2.2 + i * 0.1, duration: 0.4 }}
                          />
                        </motion.div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 text-[9px] text-muted-foreground">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                        <span key={d}>{d}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
              {/* Glow effect behind mockup */}
              <div className="absolute -inset-4 bg-gradient-to-b from-primary/5 via-primary/10 to-transparent rounded-3xl -z-10 blur-2xl" />
            </motion.div>
          </motion.section>
        </motion.div>
      </section>

      {/* Stats counter */}
      <section className="relative py-16 border-y border-border/50 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={scaleIn}
                className="text-center group"
                whileHover={{ y: -5 }}
              >
                <motion.div
                  className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors"
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <stat.icon className="h-5 w-5 text-primary" />
                </motion.div>
                <div className="text-3xl md:text-4xl font-bold font-display text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="relative max-w-6xl mx-auto px-6 py-24">
        <FloatingOrb className="w-72 h-72 bg-accent top-20 -right-20" delay={1} />

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4 border border-accent/20">
            <Sparkles className="h-3.5 w-3.5" />
            Powerful Features
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl lg:text-5xl font-bold font-display">
            Everything you need to manage
            <br />
            <span className="text-primary">your property</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            Purpose-built tools for the hospitality industry, working together seamlessly.
          </motion.p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="group relative p-6 rounded-2xl border border-border/60 bg-card overflow-hidden"
              whileHover={{ y: -8, borderColor: "hsl(var(--primary) / 0.3)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {/* Gradient background on hover */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              />
              <div className="relative z-10">
                <motion.div
                  className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors"
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <f.icon className="h-6 w-6 text-primary" />
                </motion.div>
                <h3 className="text-lg font-semibold font-display">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                <motion.div
                  className="mt-4 flex items-center gap-1 text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  initial={{ x: -10 }}
                  whileHover={{ x: 0 }}
                >
                  Learn more <ArrowRight className="h-3.5 w-3.5" />
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How it works */}
      <section className="relative py-24 bg-muted/30 border-y border-border/50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-info/10 text-info text-sm font-medium mb-4 border border-info/20">
              <Clock className="h-3.5 w-3.5" />
              Quick Setup
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl lg:text-5xl font-bold font-display">
              Get started in <span className="text-primary">3 steps</span>
            </motion.h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              { step: "01", title: "Register", desc: "Create your account and set up your property profile in minutes.", icon: Hotel },
              { step: "02", title: "Configure", desc: "Add rooms, menus, staff, and customize your dashboard.", icon: Sparkles },
              { step: "03", title: "Go Live", desc: "Start managing bookings, orders, and operations instantly.", icon: Zap },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                variants={fadeUp}
                className="relative text-center"
                whileHover={{ y: -5 }}
              >
                <motion.div
                  className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/25"
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <item.icon className="h-7 w-7 text-primary-foreground" />
                </motion.div>
                <div className="text-xs font-bold text-primary mb-2">{item.step}</div>
                <h3 className="text-xl font-bold font-display mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
                {/* Connector line */}
                {i < 2 && (
                  <motion.div
                    className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-border"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.3, duration: 0.6 }}
                    style={{ transformOrigin: "left" }}
                  />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl bg-primary p-12 md:p-16 text-center"
          whileHover={{ scale: 1.01 }}
        >
          {/* Animated background patterns */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(28_60%_52%/0.4),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsl(160_40%_40%/0.2),transparent_50%)]" />
          <motion.div
            className="absolute top-0 left-0 w-full h-full"
            style={{
              backgroundImage: "radial-gradient(circle, hsl(var(--primary-foreground) / 0.05) 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
            animate={{ backgroundPosition: ["0px 0px", "30px 30px"] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          />

          <div className="relative z-10">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="h-10 w-10 text-primary-foreground/60 mx-auto mb-6" />
            </motion.div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-display text-primary-foreground">
              Ready to streamline your operations?
            </h2>
            <p className="mt-4 text-primary-foreground/80 text-lg max-w-lg mx-auto">
              Join hospitality businesses already using LKTECH to manage their properties efficiently.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register-company">
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button size="lg" variant="secondary" className="text-base px-8 h-12 gap-2 shadow-xl">
                    Register Your Property <ArrowRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-10">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <motion.div
            className="flex items-center gap-2"
            whileHover={{ scale: 1.03 }}
          >
            <motion.div
              className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center"
              whileHover={{ rotate: 10 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Hotel className="h-4 w-4 text-primary-foreground" />
            </motion.div>
            <span className="font-bold font-display">LKTECH</span>
          </motion.div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="tel:0795872528" className="hover:text-foreground transition-colors flex items-center gap-1.5">
              <Headphones className="h-3.5 w-3.5" /> 0795872528
            </a>
            <a href="mailto:kochjomboz04@gmail.com" className="hover:text-foreground transition-colors flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> kochjomboz04@gmail.com
            </a>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} LKTECH. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
