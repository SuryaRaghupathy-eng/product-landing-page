import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart3, 
  MapPin, 
  CheckCircle2, 
  Search, 
  Globe, 
  Zap, 
  Target, 
  Layers,
  ChevronRight,
  Menu,
  Star
} from "lucide-react";
import { useState } from "react";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold group-hover:bg-blue-700 transition-colors">
              R
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Rank<span className="text-blue-600">Local</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Features</a>
            <a href="#process" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">How it Works</a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Pricing</a>
            <Link href="/">
              <Button variant="ghost" className="text-sm font-medium">Sign In</Button>
            </Link>
            <Link href="/analyze">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
                Start Free Analysis
              </Button>
            </Link>
          </nav>

          {/* Mobile Menu Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden bg-slate-50 dark:bg-slate-900/50">
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold tracking-wide uppercase border border-blue-100 dark:border-blue-800">
                <Star className="w-3 h-3 fill-current" />
                Free Trial • No Credit Card • 2-Minute Setup
              </div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                See Your Local Rankings <br />
                <span className="text-blue-600 dark:text-blue-500 italic">Across The Map</span>
              </h1>
              
              <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Instantly visualize how your business ranks for any keyword in different geographic areas. Identify gaps and opportunities in minutes, not days.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link href="/analyze">
                  <Button size="lg" className="h-14 px-10 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl shadow-blue-500/20 group">
                    Run Your Free Analysis
                    <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <a href="#process">
                  <Button variant="outline" size="lg" className="h-14 px-10 text-lg rounded-full border-2">
                    <Globe className="mr-2 w-5 h-5 text-blue-600" />
                    See How It Works
                  </Button>
                </a>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 pt-8 text-sm text-slate-500 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  Instant results
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  No setup required
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  Full-featured free trial
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-blue-200/20 blur-[100px] rounded-full -z-10" />
          <div className="absolute bottom-0 right-0 translate-x-1/4 w-80 h-80 bg-blue-300/10 blur-[80px] rounded-full -z-10" />
        </section>

        {/* Feature Teasers */}
        <section id="features" className="py-24 container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              Complete Local SEO Intelligence
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Two powerful features that work together to give you the full picture.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="relative overflow-hidden border-2 hover:border-blue-500/30 transition-all group">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                  <Layers className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-2xl">Geo Grid Analysis</CardTitle>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Primary</span>
                </div>
                <p className="text-slate-500 text-sm">
                  Get an instant snapshot of your business ranks across different geographic areas. See the full picture in minutes.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {['Visual heatmaps showing ranking patterns', 'Identify ranking gaps by location', 'Instant competitor insights'].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-2 hover:border-slate-300 transition-all group">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-2xl">Organic Ranking Tracking</CardTitle>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Secondary</span>
                </div>
                <p className="text-slate-500 text-sm">
                  Monitor how your rankings change over time. Track progress, detect drops, and measure the impact of your SEO efforts.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {['Continuous ranking monitoring', 'Historical trend analysis', 'Alert notifications for changes'].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 border-none rounded-lg h-11"
                  onClick={() => window.location.href = "/dashboard"}
                >
                  <Zap className="mr-2 w-4 h-4 fill-current" />
                  Explore Tracking
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 p-6 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 max-w-5xl mx-auto flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center flex-shrink-0 shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-1">Why Both?</h4>
              <p className="text-blue-800/70 dark:text-blue-200/70 text-sm leading-relaxed">
                Use Geo Grid Analysis to understand your current position and find opportunities. Then use Organic Ranking Tracking to monitor your progress and prove ROI as you implement changes.
              </p>
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section id="process" className="py-24 bg-slate-50 dark:bg-slate-900/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
                Three-Step Process
              </h2>
              <p className="text-slate-500">
                Get actionable insights in under 2 minutes
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  icon: MapPin,
                  title: "Add Your Business",
                  desc: "Enter your business details and the geographic area you want to analyze.",
                  step: "01"
                },
                {
                  icon: Search,
                  title: "Select Your Keyword",
                  desc: "Choose one high-impact keyword that matters most to your business goals.",
                  step: "02"
                },
                {
                  icon: Globe,
                  title: "View Results Instantly",
                  desc: "See your geo grid rankings and identify ranking gaps in real-time.",
                  step: "03"
                }
              ].map((item, i) => (
                <div key={i} className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 relative group hover:shadow-lg transition-shadow">
                  <span className="absolute top-6 right-8 text-4xl font-black text-slate-100 dark:text-slate-900 group-hover:text-blue-50 transition-colors">
                    {item.step}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why it works */}
        <section className="py-24 container mx-auto px-4">
          <div className="max-w-5xl mx-auto bg-slate-900 dark:bg-blue-950 rounded-[32px] overflow-hidden relative">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            <div className="relative z-10 p-12 md:p-16">
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-4">Why This Tool Works</h2>
                <p className="text-blue-200/70">Get the data you need to make better decisions</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-y-12 gap-x-16">
                {[
                  { icon: Zap, title: "Lightning Fast Results", desc: "Get actionable data in 2 minutes instead of days." },
                  { icon: Target, title: "Identify Ranking Gaps", desc: "Spot weak areas and focus your SEO efforts where they matter most." },
                  { icon: Globe, title: "Local Focus", desc: "Analyze rankings by specific geographic regions and districts." },
                  { icon: BarChart3, title: "Visual Intelligence", desc: "See patterns and opportunities through interactive heatmaps." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-2">{item.title}</h4>
                      <p className="text-blue-100/60 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-blue-600 text-center relative overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-2xl mx-auto space-y-8">
              <h2 className="text-4xl md:text-5xl font-black text-white">Ready to Get Started?</h2>
              <p className="text-blue-100 text-lg">Try it out for free - no credit card required</p>
              <Link href="/analyze">
                <Button size="lg" className="h-16 px-12 text-xl bg-white text-blue-600 hover:bg-blue-50 rounded-full shadow-2xl shadow-blue-900/40">
                  Run Your Free Geo Grid Analysis
                  <ChevronRight className="ml-2 w-6 h-6" />
                </Button>
              </Link>
              <p className="text-blue-200/80 text-sm">
                No credit card required • Instant setup • Full-featured free trial
              </p>
            </div>
          </div>
          
          {/* Abstract circles */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] border-[60px] border-blue-500/30 rounded-full" />
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-blue-400/20 blur-3xl rounded-full" />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-950 border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h5 className="font-bold mb-4">Product</h5>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">Company</h5>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#" className="hover:text-blue-600 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">Support</h5>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Status Page</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">Legal</h5>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© 2025 Local Ranking Tool. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-blue-600 transition-colors">Twitter</a>
              <a href="#" className="hover:text-blue-600 transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Facebook</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
