import re
text = open('src/actions/index.ts', 'r', encoding='utf-8').read()

rep = '''import { cookies } from "next/headers";
export async function setPersonalRegional(fd: FormData) {
  const id = str(fd, "regionalId");
  const c = await cookies();
  if (id) {
    c.set("personalRegional", id, { maxAge: 31536000 });
  } else {
    c.delete("personalRegional");
  }
  redirect("/#ultimo-regional");
}'''

text = re.sub(r'/\*\*\n \* Elegir a mano el.*?export async function setFeaturedRegional\(fd: FormData\) \{.*?  \}', rep, text, flags=re.DOTALL)
open('src/actions/index.ts', 'w', encoding='utf-8').write(text)
