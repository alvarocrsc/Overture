import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';

interface UploadAvatarResponse {
  data: { avatar_url: string };
}

export function useUploadAvatar() {
  const { updateUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageUri: string): Promise<string> => {
      const formData = new FormData();
      formData.append('avatar', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as unknown as Blob);

      const res = await api.post<UploadAvatarResponse>(
        '/users/me/avatar',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return res.data.data.avatar_url;
    },
    onSuccess: (avatarUrl: string): void => {
      updateUser({ avatar_url: avatarUrl });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
