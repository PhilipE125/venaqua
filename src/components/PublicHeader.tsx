import { Link } from "@tanstack/react-router";
import { Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace";

export function PublicHeader() {
  const { user } = useWorkspace();
  return <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
      <Link to="/" className="flex items-center gap-2"><Droplets className="h-6 w-6 text-primary" /><span className="text-lg font-semibold">Venaqua</span></Link>
      <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
        <Button asChild variant="ghost" size="sm"><Link to="/explore">Explore map</Link></Button>
        <Button asChild variant="ghost" size="sm"><Link to="/" hash="how">How it works</Link></Button>
        <Button asChild variant="ghost" size="sm"><Link to="/" hash="teams">For teams</Link></Button>
        <Button asChild variant="ghost" size="sm"><Link to="/pricing">Pricing</Link></Button>
      </nav>
      <div className="flex items-center gap-2">
        {user ? <Button asChild size="sm"><Link to="/app">Open workspace</Link></Button> : <>
          <Button asChild variant="ghost" size="sm"><Link to="/login">Log in</Link></Button>
          <Button asChild size="sm"><Link to="/signup">Get started</Link></Button>
        </>}
      </div>
    </div>
  </header>;
}

export function PublicFooter() {
  return <footer className="border-t">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-xs text-muted-foreground">
      <span>© Venaqua · support@venaqua.com</span>
      <nav className="flex gap-4" aria-label="Footer"><Link to="/explore">Explore map</Link><Link to="/pricing">Pricing</Link><Link to="/login">Log in</Link></nav>
    </div>
  </footer>;
}
