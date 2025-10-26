import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <h1>Welcome to CTOTextPro</h1>
        <p>
          You now have a modern Next.js App Router project ready to deploy on Vercel.
          Start by editing <code>app/page.tsx</code> to craft your experience.
        </p>
        <Link href="https://nextjs.org/docs/app">
          Explore the App Router docs
        </Link>
      </section>
    </main>
  );
}
