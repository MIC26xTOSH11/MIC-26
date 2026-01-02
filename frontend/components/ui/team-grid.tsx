"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { FlipCard, FlipCardFront, FlipCardBack } from "@/components/ui/flip-card";

type TeamMember = {
  id: number;
  initial: string;
  name: string;
  role: string;
  quote: string;
  bio: string;
  imageSrc?: string;
};

const teamMembers: TeamMember[] = [
  {
    id: 1,
    initial: "O",
    name: "Omar",
    role: "Team Lead",
    quote: "Building systems that think before they act.",
    bio: "AI/ML engineer and systems thinker, focused on security, detection pipelines, and scalable backend design.",
    imageSrc: "/images/team/Omar.jpeg",
  },
  {
    id: 2,
    initial: "T",
    name: "Tanishq",
    role: "Team Member",
    quote: "Engineering intelligence from models to machines.",
    bio: "ML engineer with strong DevOps skills, working across model training, deployment, and infrastructure automation.",
    imageSrc: "/images/team/Tanishq.jpeg",
  },
  {
    id: 3,
    initial: "H",
    name: "Hansika",
    role: "Team Member",
    quote: "Designing clarity where complexity lives.",
    bio: "Graphic designer and UI/UX specialist, focused on clean interfaces, visual storytelling, and user-centered design.",
    imageSrc: "/images/team/Hansika.jpeg",
  },
  {
    id: 4,
    initial: "A",
    name: "Anirudha",
    role: "Team Member",
    quote: "Connecting code with real-world impact.",
    bio: "Full-stack developer with strengths in business modeling, product thinking, and end-to-end system development.",
    imageSrc: "/images/team/Anirudha.jpeg",
  },
];

interface TeamGridProps {
  className?: string;
}

export default function TeamGrid({ className = "" }: TeamGridProps) {

  return (
    <section className={`relative py-20 lg:py-32 ${className}`}>
      {/* Decorative Blob Gradients */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Pulsing Dots */}
      <div className="absolute top-20 right-20 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
      <div className="absolute bottom-32 left-32 w-2 h-2 bg-cyan-400 rounded-full animate-ping" style={{ animationDelay: "1s" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-6xl font-bold mb-4 text-white">
            Meet Our Team
          </h2>
          <p className="text-xl text-slate-400">
            The brilliant minds behind TattvaDrishti Shield
          </p>
        </div>

        {/* Team Grid - Horizontal Scrolling */}
        <div className="relative overflow-hidden">
          <div className="flex gap-6 lg:gap-8 animate-scroll-left hover:[animation-play-state:paused]">
            {/* First set of cards */}
            {teamMembers.map((member) => (
              <div
                key={`first-${member.id}`}
                className="flex-shrink-0 w-[280px] sm:w-[320px]"
              >
                <FlipCard className="h-[450px] w-full">
                  <FlipCardFront className="rounded-lg">
                    <div className="h-full p-6 bg-gradient-to-br from-teal-500/20 via-emerald-500/20 to-green-500/20 backdrop-blur-xl border border-white/10 rounded-lg shadow-lg">
                      {/* Team Member Photo */}
                      <div className="aspect-square rounded-2xl mb-4 overflow-hidden bg-gradient-to-br from-emerald-500 to-cyan-500 relative">
                        {member.imageSrc ? (
                          <Image
                            src={member.imageSrc}
                            alt={member.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-5xl font-bold text-white">
                            {member.initial}
                          </div>
                        )}
                      </div>

                      {/* Name & Role */}
                      <h3 className="text-2xl font-semibold mb-1 text-white">
                        {member.name}
                      </h3>
                      <p className="text-slate-400">{member.role}</p>
                    </div>
                  </FlipCardFront>

                  <FlipCardBack className="rounded-lg">
                    <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-emerald-500/20 via-cyan-500/20 to-teal-500/20 backdrop-blur-xl border border-emerald-400/50 rounded-lg">
                      {/* Avatar Image */}
                      <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-emerald-400 shadow-lg bg-gradient-to-br from-emerald-500 to-cyan-500 relative">
                        {member.imageSrc ? (
                          <Image
                            src={member.imageSrc}
                            alt={member.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-white">
                            {member.initial}
                          </div>
                        )}
                      </div>

                      {/* Quote */}
                      <p className="text-lg italic text-emerald-300 mb-4 text-center font-medium">
                        "{member.quote}"
                      </p>

                      {/* Bio */}
                      <p className="text-sm text-slate-300 text-center leading-relaxed">
                        {member.bio}
                      </p>
                    </div>
                  </FlipCardBack>
                </FlipCard>
              </div>
            ))}
            
            {/* Duplicate set for seamless loop */}
            {teamMembers.map((member) => (
              <div
                key={`second-${member.id}`}
                className="flex-shrink-0 w-[280px] sm:w-[320px]"
              >
                <FlipCard className="h-[450px] w-full">
                  <FlipCardFront className="rounded-lg">
                    <div className="h-full p-6 bg-gradient-to-br from-teal-500/20 via-emerald-500/20 to-green-500/20 backdrop-blur-xl border border-white/10 rounded-lg shadow-lg">
                      {/* Team Member Photo */}
                      <div className="aspect-square rounded-2xl mb-4 overflow-hidden bg-gradient-to-br from-emerald-500 to-cyan-500 relative">
                        {member.imageSrc ? (
                          <Image
                            src={member.imageSrc}
                            alt={member.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-5xl font-bold text-white">
                            {member.initial}
                          </div>
                        )}
                      </div>

                      {/* Name & Role */}
                      <h3 className="text-2xl font-semibold mb-1 text-white">
                        {member.name}
                      </h3>
                      <p className="text-slate-400">{member.role}</p>
                    </div>
                  </FlipCardFront>

                  <FlipCardBack className="rounded-lg">
                    <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-emerald-500/20 via-cyan-500/20 to-teal-500/20 backdrop-blur-xl border border-emerald-400/50 rounded-lg">
                      {/* Avatar Image */}
                      <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-emerald-400 shadow-lg bg-gradient-to-br from-emerald-500 to-cyan-500 relative">
                        {member.imageSrc ? (
                          <Image
                            src={member.imageSrc}
                            alt={member.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-white">
                            {member.initial}
                          </div>
                        )}
                      </div>

                      {/* Quote */}
                      <p className="text-lg italic text-emerald-300 mb-4 text-center font-medium">
                        "{member.quote}"
                      </p>

                      {/* Bio */}
                      <p className="text-sm text-slate-300 text-center leading-relaxed">
                        {member.bio}
                      </p>
                    </div>
                  </FlipCardBack>
                </FlipCard>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
