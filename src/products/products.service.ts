import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as isUUID } from 'uuid';
import { ProductImage } from './entities';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productReporitory: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageReporitory: Repository<ProductImage>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const { images = [], ...productDetails } = createProductDto;

      const product = this.productReporitory.create({
        ...productDetails,
        images: images.map((image) =>
          this.productImageReporitory.create({ url: image }),
        ),
      });

      await this.productReporitory.save(product);

      return { ...product, images };
    } catch (error) {
      this.handleDBExceptios(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const products = await this.productReporitory.find({
      take: limit,
      skip: offset,
      relations: {
        images: true,
      },
    });

    //first map: for each product return images and other properties remain the same
    //second map: for each image from each product, return the image url
    return products.map((product) => ({
      ...product,
      images: product.images.map((img) => img.url),
    }));
  }

  async findOne(term: string) {
    let product: Product;

    if (isUUID(term)) {
      product = await this.productReporitory.findOneBy({ id: term });
    } else {
      const queryBuilder = this.productReporitory.createQueryBuilder('prod');

      product = await queryBuilder
        .where('UPPER(title) =:title or slug =:slug', {
          title: term.toUpperCase(),
          slug: term.toLowerCase(),
        })
        .leftJoinAndSelect('prod.images', 'prodImages') //brings from images table
        .getOne();
    }
    if (!product) {
      throw new NotFoundException(`Product with ${term} not found`);
    }
    return product;
  }

  async findOnePlain(term: string) {
    const { images = [], ...rest } = await this.findOne(term);

    return {
      ...rest,
      images: images.map((image) => image.url),
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { images, ...toUpdate } = updateProductDto;

    const product = await this.productReporitory.preload({
      id,
      ...toUpdate,
    });

    if (!product) {
      throw new NotFoundException(`Product with id: ${id} not found`);
    }

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (images) {
        await queryRunner.manager.delete(ProductImage, { product: { id } }); //productId from param

        product.images = images.map((image) =>
          this.productImageReporitory.create({ url: image }),
        );
      } else {
      }

      await queryRunner.manager.save(product);

      await queryRunner.commitTransaction();
      await queryRunner.release();

      return this.findOnePlain(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();

      await queryRunner.release();
      this.handleDBExceptios(error);
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productReporitory.remove(product);
  }

  //private functions
  private handleDBExceptios(error: any) {
    if ((error.code = '23505')) {
      throw new BadRequestException(error.detail);
    }
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpected error - Check server logs',
    );
  }

  async deleteAllProducts() {
    const query = this.productReporitory.createQueryBuilder('product');
    try {
      return query.delete().where({}).execute();
    } catch (error) {
      this.handleDBExceptios(error);
    }
  }
}
