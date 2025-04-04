import { RegisterSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { hash } from "bcrypt";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Parse and validate the entire body including confirm_password
    const validatedData = RegisterSchema.parse(body);
    const { email, username, password } = validatedData;

    // Check if email already exists
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUserByEmail) {
      return NextResponse.json(
        {
          error: "Email already exists",
        },
        { status: 409 }
      );
    }

    // Check if username already exists
    const existingUserByUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUserByUsername) {
      return NextResponse.json(
        {
          error: "Username already exists",
        },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        username,
        name: username,
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    
    // Type guard to check if error is an instance of Error
    if (error instanceof Error) {
      return new NextResponse(
        JSON.stringify({
          error: error.message
        }),
        { status: 400 }
      );
    }
    
    // If it's not an Error instance, return a generic error message
    return new NextResponse(
      JSON.stringify({
        error: "An unexpected error occurred during registration"
      }),
      { status: 500 }
    );
  }
} 