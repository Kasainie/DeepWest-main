import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Phone, Mail, Globe } from "lucide-react";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function About() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-2xl">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold font-display">About</h1>
        <p className="text-sm text-muted-foreground mt-1">System information & support</p>
      </motion.div>

      <motion.div variants={item}>
        <Card className="shadow-card border-0">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl font-display">LKTECH</CardTitle>
                <p className="text-sm text-muted-foreground">System Provider</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This hospitality management system is developed and maintained by <span className="font-semibold text-foreground">LKTECH</span>. 
              For support, inquiries, or feature requests, please reach out using the contact details below.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <a href="tel:+254795872528" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                    0795872528
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <a href="mailto:kochjomboz04@gmail.com" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                    kochjomboz04@gmail.com
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                © {new Date().getFullYear()} LKTECH. All rights reserved.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
