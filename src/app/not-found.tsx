import Link from 'next/link'

export const metadata = {
  title: 'Pagina nu a fost găsită',
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 text-center"
         style={{ background: '#f5f2fb' }}>

      {/* Logo */}
      <Link href="/" className="font-display font-black text-3xl tracking-tight mb-12">
        <span style={{ color: '#1c1c27' }}>kid</span>
        <span style={{ color: '#7c3aed' }}>vo</span>
      </Link>

      {/* 404 number */}
      <div className="font-display font-black" style={{ fontSize: 'clamp(80px, 15vw, 140px)', color: '#ece6ff', lineHeight: 1 }}>
        404
      </div>

      {/* Message */}
      <h1 className="font-display font-black text-2xl md:text-3xl mt-4 mb-3" style={{ color: '#1c1c27' }}>
        Pagina nu a fost găsită
      </h1>
      <p className="text-[15px] mb-10 max-w-sm" style={{ color: '#55527a' }}>
        Activitatea pe care o cauți s-ar putea să fi fost mutată sau nu mai există.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/browse"
          className="font-display font-bold rounded-2xl px-8 py-3.5 text-white text-[15px]"
          style={{ background: '#7c3aed' }}
        >
          Explorează activități
        </Link>
        <Link
          href="/"
          className="font-display font-bold rounded-2xl px-8 py-3.5 text-[15px]"
          style={{ background: 'white', color: '#1c1c27', border: '1px solid #e8e4f0' }}
        >
          Pagina principală
        </Link>
      </div>

    </div>
  )
}
