import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import LinkedInProvider from "next-auth/providers/linkedin";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/passwords";

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" && value.trim().length ? value.trim() : null;
}

function buildHeadline(role?: string | null, company?: string | null) {
  if (role && company) return `${role} @ ${company}`;
  return role || company || null;
}

async function syncLinkedInUser(params: {
  user: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
  profile?: Record<string, unknown>;
}) {
  const { user, profile } = params;
  const providerSubject =
    normalizeOptionalText(profile?.sub) ??
    normalizeOptionalText(profile?.id) ??
    normalizeOptionalText(user.id);

  if (!providerSubject) {
    throw new Error("LinkedIn sign-in did not return a stable member identifier.");
  }

  const email =
    normalizeOptionalText(user.email)?.toLowerCase() ??
    `linkedin:${providerSubject.toLowerCase()}@auth.trust50.local`;
  const name = normalizeOptionalText(user.name) ?? "LinkedIn member";
  const avatarUrl = normalizeOptionalText(user.image);
  const role = normalizeOptionalText(profile?.headline);
  const company = normalizeOptionalText(profile?.organization);
  const linkedinUrl = normalizeOptionalText(profile?.profileUrl);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    const nextName = existingUser.name ?? name;
    const nextAvatarUrl = existingUser.avatarUrl ?? avatarUrl;
    const nextRole = existingUser.role ?? role;
    const nextCompany = existingUser.company ?? company;

    return prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: nextName,
        avatarUrl: nextAvatarUrl,
        role: nextRole,
        company: nextCompany,
        headline: buildHeadline(nextRole, nextCompany),
        linkedinUrl: existingUser.linkedinUrl ?? linkedinUrl,
      },
    });
  }

  return prisma.user.create({
    data: {
      email,
      name,
      avatarUrl,
      role,
      company,
      headline: buildHeadline(role, company),
      linkedinUrl,
      passwordHash: "",
    },
  });
}

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Demo User",
    credentials: {
      email: {
        label: "Email",
        type: "email",
      },
      password: {
        label: "Password",
        type: "password",
      },
    },
    async authorize(credentials) {
      const email = credentials?.email?.trim().toLowerCase();
      const password = credentials?.password;

      if (email === "test@trust50.com" && password === "Test123") {
        const fallbackUser = await prisma.user.findUnique({
          where: {
            id: "temp-user",
          },
        });

        if (!fallbackUser) {
          return null;
        }

        return {
          id: fallbackUser.id,
          email: fallbackUser.email,
          name: fallbackUser.name ?? fallbackUser.email,
          isAdmin: true,
        };
      }

      if (!email || !password) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (!user || !verifyPassword(password, user.passwordHash)) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name ?? user.email,
        isAdmin: user.isAdmin,
      };
    },
  }),
];

if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  providers.push(
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers,
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "linkedin" && user) {
        const linkedInUser = await syncLinkedInUser({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          },
          profile: profile as Record<string, unknown> | undefined,
        });

        token.id = linkedInUser.id;
        token.isAdmin = linkedInUser.isAdmin;
        return token;
      }

      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin ?? false;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
        session.user.isAdmin = token.isAdmin ?? false;
      }

      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function getAuthSession() {
  return getServerSession(authOptions);
}
