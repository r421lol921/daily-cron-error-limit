-- Fix existing profiles with broken avatar_url
UPDATE public.profiles 
SET avatar_url = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'
WHERE avatar_url = '/default-avatar.jpg' OR avatar_url = '' OR avatar_url IS NULL;
