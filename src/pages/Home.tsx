import Game from "@/components/Game";
import bgImage from "@/assets/bg.jpg";

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-black">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-60"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      
      {/* Scanlines Overlay */}
      <div className="scanlines pointer-events-none" />
      
      {/* CRT Flicker Effect */}
      <div className="absolute inset-0 pointer-events-none crt-flicker bg-gradient-to-t from-black/20 to-transparent" />

      {/* Main Game Component */}
      <Game />
    </div>
  );
}
