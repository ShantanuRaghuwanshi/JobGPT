export { BaseRepository } from './base';
export { UserRepository } from './user';
export { UserProfileRepository } from './userProfile';
export { JobRepository } from './job';
export { ApplicationRepository } from './application';

// Repository instances for easy import
export const userRepository = new UserRepository();
export const userProfileRepository = new UserProfileRepository();
export const jobRepository = new JobRepository();
export const applicationRepository = new ApplicationRepository();