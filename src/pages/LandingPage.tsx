import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Hotel, BarChart3, Users, Shield, ChefHat, CalendarCheck, ArrowRight, Zap, Globe, Headphones } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

const features = [
  { icon: Hotel, title: "Room Management", desc: "Track availability, bookings, and housekeeping in real time." },
  { icon: ChefHat, title: "Restaurant & Kitchen", desc: "Manage orders, menus, and kitchen workflow seamlessly." },
  { icon: BarChart3, title: "Sales & Analytics", desc: "Comprehensive revenue tracking with detailed reports." },
  { icon: Users, title: "Guest Management", desc: "VIP tracking, visit history, and guest profiles." },
  { icon: CalendarCheck, title: "Conference Booking", desc: "Schedule and manage conference rooms and events." },
  { icon: Shield, title: "Staff & Security", desc: "Role-based access with secure staff code login." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <Hotel className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold font-display tracking-tight">LKTECH</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/register-company">
              <Button size="sm" className="gap-1.5">
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <motion.section
        variants={stagger}
        initial="hidden"
        animate="show"
        className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center"
      >
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
          <Zap className="h-3.5 w-3.5" />
          Hospitality Management, Simplified
        </motion.div>
        <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl lg:text-7xl font-bold font-display leading-[1.1] tracking-tight max-w-4xl mx-auto">
          Run your property{" "}
          <span className="text-primary">smarter</span>, not harder
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          The all-in-one platform for hotels, restaurants, and hospitality businesses. 
          Manage rooms, orders, staff, and finances — all from one dashboard.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register-company">
            <Button size="lg" className="text-base px-8 gap-2 h-12">
              Start Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg" className="text-base px-8 h-12">
              Sign In
            </Button>
          </Link>
        </motion.div>
      </motion.section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold font-display">
            Everything you need to manage your property
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
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="group p-6 rounded-2xl border border-border/60 bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold font-display">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-primary p-12 md:p-16 text-center"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(28_60%_52%/0.4),transparent_60%)]" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold font-display text-primary-foreground">
              Ready to streamline your operations?
            </h2>
            <p className="mt-4 text-primary-foreground/80 text-lg max-w-lg mx-auto">
              Join hospitality businesses already using LKTECH to manage their properties efficiently.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register-company">
                <Button size="lg" variant="secondary" className="text-base px-8 h-12 gap-2">
                  Register Your Property <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-10">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <Hotel className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold font-display">LKTECH</span>
          </div>
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
