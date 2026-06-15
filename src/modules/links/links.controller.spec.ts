import { Test, TestingModule } from '@nestjs/testing';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';
import { UserRole } from '../auth/entities/user.entity';

const mockLinksService = {
  createLink: jest.fn(),
  getLinks: jest.fn(),
  getLinkById: jest.fn(),
  updateLink: jest.fn(),
  deleteLink: jest.fn(),
};

describe('LinksController', () => {
  let controller: LinksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinksController],
      providers: [{ provide: LinksService, useValue: mockLinksService }],
    }).compile();

    controller = module.get<LinksController>(LinksController);
    jest.clearAllMocks();
  });

  const user = { userId: 1, email: 'test@test.com', role: UserRole.USER, sessionKey: 'k' };

  it('should create a link', async () => {
    const link = { id: 1, shortCode: 'abc' };
    mockLinksService.createLink.mockResolvedValue(link);
    const result = await controller.create({ originalUrl: 'https://example.com' }, user);
    expect(result.statusCode).toBe(201);
    expect(result.response).toEqual(link);
  });

  it('should get all links', async () => {
    const data = { data: [], pagination: { page: 1, limit: 10, total: 0 } };
    mockLinksService.getLinks.mockResolvedValue(data);
    const result = await controller.findAll(user, [], '1', '10');
    expect(result.statusCode).toBe(200);
    expect(result.response).toEqual(data);
  });

  it('should use default pagination when not provided', async () => {
    const data = { data: [], pagination: { page: 1, limit: 10, total: 0 } };
    mockLinksService.getLinks.mockResolvedValue(data);
    await controller.findAll(user, []);
    expect(mockLinksService.getLinks).toHaveBeenCalledWith(1, 1, 10, [], undefined);
  });

  it('should get link by id', async () => {
    const link = { id: 1 };
    mockLinksService.getLinkById.mockResolvedValue(link);
    const result = await controller.findOne(1, user);
    expect(result.statusCode).toBe(200);
    expect(result.response).toEqual(link);
  });

  it('should update a link', async () => {
    const link = { id: 1, originalUrl: 'https://new.com' };
    mockLinksService.updateLink.mockResolvedValue(link);
    const result = await controller.update(1, { originalUrl: 'https://new.com' }, user);
    expect(result.statusCode).toBe(200);
    expect(result.response).toEqual(link);
  });

  it('should delete a link', async () => {
    mockLinksService.deleteLink.mockResolvedValue(undefined);
    const result = await controller.remove(1, user);
    expect(result.statusCode).toBe(200);
    expect(result.message).toBe('Link deleted successfully');
  });
});
