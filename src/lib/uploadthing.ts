import { createUploadthing, type FileRouter } from "uploadthing/next"
import { auth } from "@clerk/nextjs/server"

const f = createUploadthing()

export const ourFileRouter = {
  issueAttachment: f({
    image: { maxFileSize: "32MB", maxFileCount: 10 },
    pdf: { maxFileSize: "32MB", maxFileCount: 5 },
    "application/zip": { maxFileSize: "32MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "32MB",
      maxFileCount: 5,
    },
  })
    .middleware(async () => {
      const { userId } = await auth()
      if (!userId) throw new Error("Unauthorized")
      return { uploadedBy: userId }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url, name: file.name, size: file.size, type: file.type }
    }),

  messageAttachment: f({
    image: { maxFileSize: "32MB", maxFileCount: 10 },
    video: { maxFileSize: "32MB", maxFileCount: 5 },
    pdf: { maxFileSize: "32MB", maxFileCount: 5 },
  })
    .middleware(async () => {
      const { userId } = await auth()
      if (!userId) throw new Error("Unauthorized")
      return { uploadedBy: userId }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url, name: file.name, size: file.size, type: file.type }
    }),

  workspaceLogo: f({
    image: { maxFileSize: "2MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const { userId } = await auth()
      if (!userId) throw new Error("Unauthorized")
      return { uploadedBy: userId }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url }
    }),

  userAvatar: f({
    image: { maxFileSize: "2MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const { userId } = await auth()
      if (!userId) throw new Error("Unauthorized")
      return { uploadedBy: userId }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
